using database;
using database.Identity;
using database.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using System.Text;

namespace webserver.Auth;

public sealed class AccountService(
    MoneyGestorContext legacyDatabase,
    IdentityAccountContext identityDatabase,
    UserManager<ApplicationIdentityUser> userManager,
    SignInManager<ApplicationIdentityUser> signInManager,
    IAccountEmailSender emailSender,
    ILogger<AccountService> logger,
    IOptions<EmailOptions> configuredEmail,
    TimeProvider timeProvider) {
    internal const String IdentityManagedPassword = "IDENTITY_MANAGED";

    public Boolean RequireConfirmedEmail => signInManager.Options.SignIn.RequireConfirmedEmail;

    public async Task<UInt64?> RegisterAsync(RegisterAccountRequest request, CancellationToken cancellationToken) {
        var normalizedUsername = userManager.NormalizeName(request.Username);
        var normalizedEmail = userManager.NormalizeEmail(request.Email);
        if (await userManager.Users.AnyAsync(
                user => user.NormalizedUserName == normalizedUsername || user.NormalizedEmail == normalizedEmail,
                cancellationToken)) {
            return null;
        }

        if (await legacyDatabase.Users.AnyAsync(
                user => user.Username.ToUpper() == normalizedUsername || user.Email.ToUpper() == normalizedEmail,
                cancellationToken)) {
            return null;
        }

        var legacyUser = new UserDb {
            Firstname = request.Firstname.Trim(),
            Lastname = request.Lastname.Trim(),
            Username = request.Username.Trim(),
            Email = request.Email.Trim(),
            Password = IdentityManagedPassword
        };
        var identityUser = new ApplicationIdentityUser {
            UserName = legacyUser.Username,
            Email = legacyUser.Email
        };

        // Both EF contexts use the same MySQL connection and transaction during registration.
        await using (var transaction = await legacyDatabase.Database.BeginTransactionAsync(cancellationToken)) {
            identityDatabase.Database.SetDbConnection(legacyDatabase.Database.GetDbConnection(), contextOwnsConnection: false);
            await identityDatabase.Database.UseTransactionAsync(transaction.GetDbTransaction(), cancellationToken);
            try {
                legacyDatabase.Users.Add(legacyUser);
                try {
                    await legacyDatabase.SaveChangesAsync(cancellationToken);
                } catch (DbUpdateException exception) when (IsDuplicateEntry(exception)) {
                    return null;
                }

                identityUser.LegacyUserId = legacyUser.Id;
                var created = await userManager.CreateAsync(identityUser, request.Password);
                if (!created.Succeeded) {
                    throw new AccountValidationException(created.Errors.Select(error => error.Code).ToArray());
                }

                await transaction.CommitAsync(cancellationToken);
            } finally {
                await identityDatabase.Database.UseTransactionAsync(null, CancellationToken.None);
            }
        }

        if (RequireConfirmedEmail) {
            try {
                await SendConfirmationAsync(identityUser, cancellationToken);
            } catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException) {
                logger.LogWarning("Registration succeeded, but confirmation email delivery failed ({ExceptionType})", exception.GetType().Name);
            }
        }

        return legacyUser.Id;
    }

    private static Boolean IsDuplicateEntry(DbUpdateException exception) {
        for (Exception? current = exception; current != null; current = current.InnerException) {
            if (current is MySql.Data.MySqlClient.MySqlException { Number: 1062 }) {
                return true;
            }
        }

        return false;
    }

    public async Task<AccountLoginStatus> LoginAsync(
        LoginAccountRequest request,
        Boolean issueCookie,
        CancellationToken cancellationToken) {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await FindByLoginAsync(request.User);
        if (user == null) {
            _ = userManager.PasswordHasher.HashPassword(
                new ApplicationIdentityUser(),
                "constant-time-enumeration-padding");
            return AccountLoginStatus.Invalid;
        }

        var check = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (check.IsLockedOut) {
            return AccountLoginStatus.LockedOut;
        }

        if (!check.Succeeded) {
            return AccountLoginStatus.Invalid;
        }

        if (RequireConfirmedEmail && !await userManager.IsEmailConfirmedAsync(user)) {
            return AccountLoginStatus.EmailNotConfirmed;
        }

        if (issueCookie) {
            await signInManager.SignInAsync(user, new Microsoft.AspNetCore.Authentication.AuthenticationProperties {
                IsPersistent = request.Remember,
                AllowRefresh = true,
                ExpiresUtc = timeProvider.GetUtcNow().Add(request.Remember ? TimeSpan.FromDays(30) : TimeSpan.FromHours(2))
            });
        }

        return AccountLoginStatus.Succeeded;
    }

    public Task LogoutAsync() => signInManager.SignOutAsync();

    public async Task<AccountProfile?> GetProfileAsync(
        System.Security.Claims.ClaimsPrincipal principal,
        CancellationToken cancellationToken) {
        var identityUser = await userManager.GetUserAsync(principal);
        return identityUser == null
            ? null
            : await legacyDatabase.Users
            .Where(user => user.Id == identityUser.LegacyUserId)
            .Select(user => new AccountProfile(user.Id, user.Firstname, user.Lastname, user.Email, user.Username))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task ConfirmEmailAsync(ConfirmEmailRequest request) {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user == null || user.EmailConfirmed) {
            throw new AccountTokenException();
        }

        var result = await userManager.ConfirmEmailAsync(user, DecodeToken(request.Token));
        if (!result.Succeeded) {
            throw new AccountTokenException();
        }
    }

    public async Task ResendConfirmationAsync(String email, CancellationToken cancellationToken) {
        if (!RequireConfirmedEmail) {
            return;
        }

        var user = await userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.EmailConfirmed) {
            return;
        }

        await SendConfirmationAsync(user, cancellationToken);
    }

    public async Task SendPasswordResetAsync(String email, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(email.Trim());
        if (user == null || (RequireConfirmedEmail && !user.EmailConfirmed)) {
            return;
        }

        var token = EncodeToken(await userManager.GeneratePasswordResetTokenAsync(user));
        var link = $"{configuredEmail.Value.FrontendBaseUrl.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        await emailSender.SendPasswordResetAsync(email, link, cancellationToken);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request) {
        var user = await userManager.FindByEmailAsync(request.Email.Trim()) ?? throw new AccountTokenException();

        var result = await userManager.ResetPasswordAsync(user, DecodeToken(request.Token), request.Password);
        if (!result.Succeeded) {
            var tokenError = result.Errors.Any(error => error.Code.Contains("Token", StringComparison.OrdinalIgnoreCase));
            if (tokenError) {
                throw new AccountTokenException();
            }

            throw new AccountValidationException(result.Errors.Select(error => error.Code).ToArray());
        }

        await userManager.UpdateSecurityStampAsync(user);
    }

    public async Task<UInt64?> GetLegacyUserIdAsync(String login) =>
        (await FindByLoginAsync(login))?.LegacyUserId;

    private async Task<ApplicationIdentityUser?> FindByLoginAsync(String login) {
        var value = login.Trim();
        return value.Contains('@', StringComparison.Ordinal)
            ? await userManager.FindByEmailAsync(value)
            : await userManager.FindByNameAsync(value);
    }

    private async Task SendConfirmationAsync(ApplicationIdentityUser user, CancellationToken cancellationToken) {
        var token = EncodeToken(await userManager.GenerateEmailConfirmationTokenAsync(user));
        var link = $"{configuredEmail.Value.FrontendBaseUrl.TrimEnd('/')}/verify-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(token)}";
        await emailSender.SendConfirmationAsync(user.Email!, link, cancellationToken);
    }

    private static String EncodeToken(String token) =>
        WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

    private static String DecodeToken(String token) {
        try {
            return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        } catch (FormatException) {
            throw new AccountTokenException();
        }
    }
}

public sealed class AccountValidationException(String[] errors) : Exception("Account validation failed") {
    public IReadOnlyList<String> Errors { get; } = errors;
}

public sealed class AccountTokenException : Exception {
    public AccountTokenException() : base("The account token is invalid or expired") {
    }
}

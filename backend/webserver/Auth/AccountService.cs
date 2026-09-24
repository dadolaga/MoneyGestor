using System.Text;
using database;
using database.Identity;
using database.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace webserver.Auth;

public sealed class AccountService(
    MoneyGestorContext legacyDatabase,
    UserManager<ApplicationIdentityUser> userManager,
    SignInManager<ApplicationIdentityUser> signInManager,
    IAccountEmailSender emailSender,
    ILogger<AccountService> logger,
    IOptions<EmailOptions> configuredEmail,
    TimeProvider timeProvider) {
    internal const String IdentityManagedPassword = "IDENTITY_MANAGED";

    public async Task RegisterAsync(RegisterAccountRequest request, CancellationToken cancellationToken) {
        var normalizedUsername = userManager.NormalizeName(request.Username);
        var normalizedEmail = userManager.NormalizeEmail(request.Email);
        if (await userManager.Users.AnyAsync(
                user => user.NormalizedUserName == normalizedUsername || user.NormalizedEmail == normalizedEmail,
                cancellationToken)) {
            return;
        }

        if (await legacyDatabase.Users.AnyAsync(
                user => user.Username.ToUpper() == normalizedUsername || user.Email.ToUpper() == normalizedEmail,
                cancellationToken)) {
            return;
        }

        var legacyUser = new UserDb {
            Firstname = request.Firstname.Trim(),
            Lastname = request.Lastname.Trim(),
            Username = request.Username.Trim(),
            Email = request.Email.Trim(),
            Password = IdentityManagedPassword
        };
        legacyDatabase.Users.Add(legacyUser);
        try {
            await legacyDatabase.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException) {
            return;
        }

        var identityUser = new ApplicationIdentityUser {
            LegacyUserId = legacyUser.Id,
            UserName = legacyUser.Username,
            Email = legacyUser.Email
        };
        var created = await userManager.CreateAsync(identityUser, request.Password);
        if (!created.Succeeded) {
            legacyDatabase.Users.Remove(legacyUser);
            await legacyDatabase.SaveChangesAsync(cancellationToken);
            throw new AccountValidationException(created.Errors.Select(error => error.Code).ToArray());
        }

        try {
            await SendConfirmationAsync(identityUser, cancellationToken);
        } catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException) {
            logger.LogWarning("Registration succeeded, but confirmation email delivery failed ({ExceptionType})", exception.GetType().Name);
        }
    }

    public async Task<AccountLoginStatus> LoginAsync(
        LoginAccountRequest request,
        Boolean issueCookie,
        CancellationToken cancellationToken) {
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
        if (!await userManager.IsEmailConfirmedAsync(user)) {
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

    public async Task<AccountProfile?> GetProfileAsync(System.Security.Claims.ClaimsPrincipal principal) {
        var identityUser = await userManager.GetUserAsync(principal);
        if (identityUser == null) {
            return null;
        }

        return await legacyDatabase.Users
            .Where(user => user.Id == identityUser.LegacyUserId)
            .Select(user => new AccountProfile(user.Id, user.Firstname, user.Lastname, user.Email, user.Username))
            .SingleOrDefaultAsync();
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
        var user = await userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.EmailConfirmed) {
            return;
        }

        await SendConfirmationAsync(user, cancellationToken);
    }

    public async Task SendPasswordResetAsync(String email, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(email.Trim());
        if (user == null || !user.EmailConfirmed) {
            return;
        }

        var token = EncodeToken(await userManager.GeneratePasswordResetTokenAsync(user));
        var link = $"{configuredEmail.Value.FrontendBaseUrl.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        await emailSender.SendPasswordResetAsync(email, link, cancellationToken);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request) {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user == null) {
            throw new AccountTokenException();
        }

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

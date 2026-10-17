using database.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Globalization;
using System.Text;

namespace webserver.Auth;

public sealed class AccountService(
    UserManager<ApplicationIdentityUser> userManager,
    SignInManager<ApplicationIdentityUser> signInManager,
    IAccountEmailSender emailSender,
    ILogger<AccountService> logger,
    IOptions<EmailOptions> configuredEmail,
    TimeProvider timeProvider) {
    public Boolean RequireConfirmedEmail => signInManager.Options.SignIn.RequireConfirmedEmail;

    public async Task<UInt64?> RegisterAsync(RegisterAccountRequest request, CancellationToken cancellationToken) {
        cancellationToken.ThrowIfCancellationRequested();
        var user = new ApplicationIdentityUser {
            Firstname = request.Firstname.Trim(),
            Lastname = request.Lastname.Trim(),
            UserName = request.Username.Trim(),
            Email = request.Email.Trim()
        };

        IdentityResult created;
        try {
            created = await userManager.CreateAsync(user, request.Password);
        } catch (DbUpdateException exception) when (IsDuplicateEntry(exception)) {
            // Concurrent registration keeps the same generic acceptance as an existing account.
            return null;
        }

        if (!created.Succeeded) {
            if (created.Errors.Any(error => error.Code is "DuplicateUserName" or "DuplicateEmail")) {
                return null;
            }

            throw new AccountValidationException(created.Errors.Select(error => error.Code).ToArray());
        }

        if (RequireConfirmedEmail) {
            try {
                await SendConfirmationAsync(user, cancellationToken);
            } catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException) {
                logger.LogWarning("Registration succeeded, but confirmation email delivery failed ({ExceptionType})", exception.GetType().Name);
            }
        }

        return user.Id;
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

        await signInManager.SignInAsync(user, new Microsoft.AspNetCore.Authentication.AuthenticationProperties {
            IsPersistent = request.Remember,
            AllowRefresh = true,
            ExpiresUtc = timeProvider.GetUtcNow().Add(request.Remember ? TimeSpan.FromDays(30) : TimeSpan.FromHours(2))
        });

        return AccountLoginStatus.Succeeded;
    }

    public Task LogoutAsync() => signInManager.SignOutAsync();

    public async Task<AccountProfile?> GetProfileAsync(
        System.Security.Claims.ClaimsPrincipal principal,
        CancellationToken cancellationToken) {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await userManager.GetUserAsync(principal);
        return user == null
            ? null
            : new AccountProfile(user.Id, user.Firstname, user.Lastname, user.Email!, user.UserName!);
    }

    public async Task ConfirmEmailAsync(ConfirmEmailRequest request) {
        if (!UInt64.TryParse(request.UserId, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) || userId == 0) {
            throw new AccountTokenException();
        }

        var user = await userManager.FindByIdAsync(userId.ToString(CultureInfo.InvariantCulture));
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

    private async Task<ApplicationIdentityUser?> FindByLoginAsync(String login) {
        var value = login.Trim();
        return value.Contains('@', StringComparison.Ordinal)
            ? await userManager.FindByEmailAsync(value)
            : await userManager.FindByNameAsync(value);
    }

    private async Task SendConfirmationAsync(ApplicationIdentityUser user, CancellationToken cancellationToken) {
        var token = EncodeToken(await userManager.GenerateEmailConfirmationTokenAsync(user));
        var link = $"{configuredEmail.Value.FrontendBaseUrl.TrimEnd('/')}/verify-email?userId={user.Id.ToString(CultureInfo.InvariantCulture)}&token={Uri.EscapeDataString(token)}";
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

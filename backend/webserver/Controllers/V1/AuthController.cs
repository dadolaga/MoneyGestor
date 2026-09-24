using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webserver.Auth;

namespace webserver.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    AccountService accounts,
    AccountAbuseGuard abuseGuard,
    IAntiforgery antiforgery,
    ILogger<AuthController> logger) : ControllerBase {
    [HttpGet("antiforgery")]
    [AllowAnonymous]
    public IActionResult AntiforgeryToken() {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(RegisterAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("register", request.Email, 5, TimeSpan.FromHours(1))) {
            return RateLimited();
        }

        try {
            await accounts.RegisterAsync(request, cancellationToken);
        } catch (AccountValidationException exception) {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<String, String[]> {
                ["account"] = exception.Errors.ToArray()
            }) { Title = "Account validation failed", Status = StatusCodes.Status400BadRequest });
        }

        return Accepted(new { message = "If the account can be created, a confirmation email will be sent." });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("login", request.User, 20, TimeSpan.FromMinutes(15))) {
            return RateLimited();
        }

        var result = await accounts.LoginAsync(request, issueCookie: true, cancellationToken);
        return result switch {
            AccountLoginStatus.Succeeded => NoContent(),
            AccountLoginStatus.LockedOut => Problem(
                statusCode: StatusCodes.Status423Locked,
                title: "Account temporarily locked",
                detail: "Too many failed login attempts."),
            _ => Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Login failed",
                detail: "The credentials are invalid or the email is not confirmed.")
        };
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<IActionResult> Session() {
        var profile = await accounts.GetProfileAsync(User);
        return profile == null ? Unauthorized() : Ok(profile);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout() {
        await accounts.LogoutAsync();
        return NoContent();
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request) {
        if (!Permit("confirm", request.UserId, 10, TimeSpan.FromHours(1))) {
            return RateLimited();
        }
        try {
            await accounts.ConfirmEmailAsync(request);
            return NoContent();
        } catch (AccountTokenException) {
            return InvalidToken();
        }
    }

    [HttpPost("resend-confirmation")]
    [AllowAnonymous]
    public async Task<IActionResult> Resend(EmailAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("resend", request.Email, 5, TimeSpan.FromHours(1))) {
            return RateLimited();
        }
        try {
            await accounts.ResendConfirmationAsync(request.Email, cancellationToken);
        } catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException) {
            logger.LogWarning("Confirmation email delivery failed ({ExceptionType})", exception.GetType().Name);
        }
        return Accepted(new { message = "If the account exists, a confirmation email will be sent." });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword(EmailAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("forgot", request.Email, 5, TimeSpan.FromHours(1))) {
            return RateLimited();
        }
        try {
            await accounts.SendPasswordResetAsync(request.Email, cancellationToken);
        } catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException) {
            logger.LogWarning("Password reset email delivery failed ({ExceptionType})", exception.GetType().Name);
        }
        return Accepted(new { message = "If the account exists, a password reset email will be sent." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request) {
        if (!Permit("reset", request.Email, 10, TimeSpan.FromHours(1))) {
            return RateLimited();
        }
        try {
            await accounts.ResetPasswordAsync(request);
            return NoContent();
        } catch (AccountTokenException) {
            return InvalidToken();
        } catch (AccountValidationException exception) {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<String, String[]> {
                ["password"] = exception.Errors.ToArray()
            }) { Title = "Password validation failed", Status = StatusCodes.Status400BadRequest });
        }
    }

    private Boolean Permit(String operation, String identity, Int32 limit, TimeSpan window) =>
        abuseGuard.Permit(operation, HttpContext.Connection.RemoteIpAddress?.ToString(), identity, limit, window);

    private ObjectResult RateLimited() => Problem(
        statusCode: StatusCodes.Status429TooManyRequests,
        title: "Too many requests",
        detail: "Try again later.");

    private ObjectResult InvalidToken() => Problem(
        statusCode: StatusCodes.Status400BadRequest,
        title: "Invalid or expired token");
}

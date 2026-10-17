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
    [HttpGet("configuration")]
    [AllowAnonymous]
    public ActionResult<AccountConfiguration> Configuration() {
        Response.Headers.CacheControl = "no-store";
        return Ok(new AccountConfiguration(accounts.RequireConfirmedEmail));
    }

    [HttpGet("antiforgery")]
    [AllowAnonymous]
    public IActionResult AntiforgeryToken() {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType<AccountRegistrationResponse>(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> Register(RegisterAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("register", request.Email, 5, TimeSpan.FromHours(1))) {
            return RateLimited();
        }

        try {
            await accounts.RegisterAsync(request, cancellationToken);
        } catch (AccountValidationException exception) {
            return ValidationFailure("Account validation failed", "account", exception.Errors.ToArray());
        }

        return Accepted(new AccountRegistrationResponse(
            accounts.RequireConfirmedEmail
                ? "If the account can be created, a confirmation email will be sent."
                : "If the account can be created, you can log in without email confirmation.",
            accounts.RequireConfirmedEmail));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginAccountRequest request, CancellationToken cancellationToken) {
        if (!Permit("login", request.User, 20, TimeSpan.FromMinutes(15))) {
            return RateLimited();
        }

        var result = await accounts.LoginAsync(request, cancellationToken);
        return result switch {
            AccountLoginStatus.Succeeded => NoContent(),
            AccountLoginStatus.LockedOut => CodedProblem(StatusCodes.Status423Locked, "account_locked", "Account temporarily locked"),
            _ => CodedProblem(StatusCodes.Status401Unauthorized, "invalid_credentials", "Login failed")
        };
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<IActionResult> Session() {
        var profile = await accounts.GetProfileAsync(User, HttpContext.RequestAborted);
        return profile == null ? Unauthorized() : Ok(profile);
    }

    [HttpPost("logout")]
    [Authorize]
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

        return Accepted(new { message = "If confirmation is required and the account needs it, a confirmation email will be sent." });
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
            return ValidationFailure("Password validation failed", "password", exception.Errors.ToArray());
        }
    }

    private Boolean Permit(String operation, String identity, Int32 limit, TimeSpan window) =>
        abuseGuard.Permit(operation, HttpContext.Connection.RemoteIpAddress?.ToString(), identity, limit, window);

    private ObjectResult RateLimited() => CodedProblem(StatusCodes.Status429TooManyRequests, "rate_limit_exceeded", "Too many requests");

    private ObjectResult InvalidToken() => CodedProblem(StatusCodes.Status400BadRequest, "invalid_token", "Invalid or expired token");

    private ObjectResult ValidationFailure(String title, String field, String[] errors) {
        var problem = new ValidationProblemDetails(new Dictionary<String, String[]> { [field] = errors }) {
            Type = "https://api.moneygestor.example/problems/validation-failed",
            Title = title,
            Status = StatusCodes.Status400BadRequest
        };
        AddProblemMetadata(problem, "validation_failed");
        return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest, ContentTypes = { "application/problem+json" } };
    }

    private ObjectResult CodedProblem(Int32 status, String code, String title) {
        var problem = new ProblemDetails {
            Type = $"https://api.moneygestor.example/problems/{code}",
            Status = status,
            Title = title
        };
        AddProblemMetadata(problem, code);
        return new ObjectResult(problem) { StatusCode = status, ContentTypes = { "application/problem+json" } };
    }

    private void AddProblemMetadata(ProblemDetails problem, String code) {
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
    }
}

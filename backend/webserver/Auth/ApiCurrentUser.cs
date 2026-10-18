using database.Identity;
using Microsoft.AspNetCore.Identity;
using System.Globalization;
using System.Security.Claims;

namespace webserver.Auth;

public interface IApiCurrentUser {
    UInt64 RequireId(ClaimsPrincipal principal);
}

public sealed class ApiCurrentUser(UserManager<ApplicationIdentityUser> users) : IApiCurrentUser {
    public UInt64 RequireId(ClaimsPrincipal principal) {
        return principal.Identity?.IsAuthenticated != true
            || !UInt64.TryParse(users.GetUserId(principal), NumberStyles.None, CultureInfo.InvariantCulture, out var userId)
            || userId == 0
            ? throw new UnauthorizedAccessException("Authenticated account identity is unavailable.")
            : userId;
    }
}
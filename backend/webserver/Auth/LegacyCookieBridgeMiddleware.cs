using System.Security.Claims;
using System.Security.Cryptography;
using database;
using database.Identity;
using database.Models;
using Microsoft.EntityFrameworkCore;

namespace webserver.Auth;

public sealed class LegacyCookieBridgeMiddleware(RequestDelegate next) {
    public async Task InvokeAsync(HttpContext context, IdentityAccountContext identityDatabase) {
        if (!context.Request.Path.StartsWithSegments("/api/v1") &&
            context.User.Identity?.IsAuthenticated == true &&
            !context.Request.Headers.ContainsKey("Authorization")) {
            var identityId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var legacyUserId = await identityDatabase.Users
                .Where(user => user.Id == identityId)
                .Select(user => (UInt64?)user.LegacyUserId)
                .SingleOrDefaultAsync(context.RequestAborted);

            if (legacyUserId != null) {
                using var legacyDatabase = new MoneyGestorContext();
                var now = DateTime.Now;
                var login = await legacyDatabase.Logins
                    .Where(item => item.UserId == legacyUserId && item.Expirated > now)
                    .OrderByDescending(item => item.Expirated)
                    .FirstOrDefaultAsync(context.RequestAborted);
                if (login == null) {
                    login = new LoginDb {
                        Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)),
                        Expirated = now.AddMinutes(10),
                        IsLong = false,
                        UserId = legacyUserId.Value
                    };
                    legacyDatabase.Logins.Add(login);
                    await legacyDatabase.SaveChangesAsync(context.RequestAborted);
                }
                context.Request.Headers.Authorization = login.Token;
            }
        }

        await next(context);
    }
}

using database;
using database.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace webserver.Auth;

public sealed class LegacyIdentityBootstrapper(
    MoneyGestorContext legacyDatabase,
    IdentityAccountContext identityDatabase,
    ILookupNormalizer normalizer) {
    public async Task RunAsync(CancellationToken cancellationToken = default) {
        var legacyUsers = await legacyDatabase.Users.AsNoTracking().ToListAsync(cancellationToken);
        var mappedIds = (await identityDatabase.Users
            .Select(user => user.LegacyUserId)
            .ToListAsync(cancellationToken)).ToHashSet();

        var incompleteRegistrations = legacyUsers
            .Where(user => user.Password == AccountService.IdentityManagedPassword && !mappedIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToArray();
        if (incompleteRegistrations.Length > 0) {
            throw new InvalidOperationException(
                $"Identity migration blocked by incomplete registrations. User IDs: {String.Join(',', incompleteRegistrations)}");
        }

        var usernameCollisions = legacyUsers
            .GroupBy(user => normalizer.NormalizeName(user.Username))
            .Where(group => group.Count() > 1)
            .Select(group => String.Join(',', group.Select(user => user.Id)))
            .ToArray();
        var emailCollisions = legacyUsers
            .GroupBy(user => normalizer.NormalizeEmail(user.Email))
            .Where(group => group.Count() > 1)
            .Select(group => String.Join(',', group.Select(user => user.Id)))
            .ToArray();

        if (usernameCollisions.Length > 0 || emailCollisions.Length > 0) {
            throw new InvalidOperationException(
                $"Identity migration blocked by normalized account collisions. User IDs: {String.Join(';', usernameCollisions.Concat(emailCollisions))}");
        }

        foreach (var legacyUser in legacyUsers.Where(user => !mappedIds.Contains(user.Id))) {
            identityDatabase.Users.Add(new ApplicationIdentityUser {
                Id = Guid.NewGuid().ToString("N"),
                LegacyUserId = legacyUser.Id,
                UserName = legacyUser.Username,
                NormalizedUserName = normalizer.NormalizeName(legacyUser.Username),
                Email = legacyUser.Email,
                NormalizedEmail = normalizer.NormalizeEmail(legacyUser.Email),
                EmailConfirmed = true,
                PasswordHash = legacyUser.Password,
                SecurityStamp = Guid.NewGuid().ToString("N"),
                ConcurrencyStamp = Guid.NewGuid().ToString("N")
            });
        }

        await identityDatabase.SaveChangesAsync(cancellationToken);
    }
}

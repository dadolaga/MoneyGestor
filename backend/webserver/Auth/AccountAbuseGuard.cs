using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace webserver.Auth;

public sealed class AccountAbuseGuard(TimeProvider timeProvider) {
    private const Int32 MaxTrackedKeys = 50_000;
    private sealed record Counter(DateTimeOffset ExpiresAt, Int32 Count);
    private readonly ConcurrentDictionary<String, Counter> counters = new();
    private Int32 attempts;

    public Boolean Permit(String operation, String? ipAddress, String identity, Int32 limit, TimeSpan window) {
        var now = timeProvider.GetUtcNow();
        if (Interlocked.Increment(ref attempts) % 128 == 0) {
            foreach (var expired in counters.Where(item => item.Value.ExpiresAt <= now)) {
                counters.TryRemove(expired.Key, out _);
            }
        }
        if (counters.Count >= MaxTrackedKeys) {
            return false;
        }

        var normalizedIdentity = identity.Trim().ToUpperInvariant();
        var identityKey = Hash($"{operation}|identity|{normalizedIdentity}");
        var ipKey = Hash($"{operation}|ip|{ipAddress ?? "unknown"}");

        return Increment(identityKey, limit, window, now) &&
            Increment(ipKey, checked(limit * 4), window, now);
    }

    private Boolean Increment(String key, Int32 limit, TimeSpan window, DateTimeOffset now) {
        var updated = counters.AddOrUpdate(
            key,
            _ => new Counter(now.Add(window), 1),
            (_, current) => now >= current.ExpiresAt
                ? new Counter(now.Add(window), 1)
                : current with { Count = current.Count + 1 });

        return updated.Count <= limit;
    }

    private static String Hash(String value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}

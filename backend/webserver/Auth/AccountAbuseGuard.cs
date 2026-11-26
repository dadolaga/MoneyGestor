using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace webserver.Auth;

public sealed class AccountAbuseGuard(TimeProvider timeProvider) {
    private const Int32 MaxTrackedIdentities = 50_000;
    private const Int32 MaxTrackedIps = 10_000;
    private sealed record Counter(DateTimeOffset ExpiresAt, Int32 Count);
    private readonly ConcurrentDictionary<String, Counter> identityCounters = new();
    private readonly ConcurrentDictionary<String, Counter> ipCounters = new();
    private readonly Object identityEvictionGate = new();
    private readonly Object ipEvictionGate = new();

    internal Int32 TrackedIdentityCount => identityCounters.Count;

    public Boolean Permit(String operation, String? ipAddress, String identity, Int32 limit, TimeSpan window) {
        var now = timeProvider.GetUtcNow();
        var ipKey = Hash($"{operation}|ip|{ipAddress ?? "unknown"}");
        if (!Increment(ipCounters, ipEvictionGate, MaxTrackedIps, ipKey, checked(limit * 4), window, now)) {
            return false;
        }

        var normalizedIdentity = identity.Trim().ToUpperInvariant();
        var identityKey = Hash($"{operation}|identity|{normalizedIdentity}");
        return Increment(identityCounters, identityEvictionGate, MaxTrackedIdentities, identityKey, limit, window, now);
    }

    private static Boolean Increment(
        ConcurrentDictionary<String, Counter> counters,
        Object evictionGate,
        Int32 capacity,
        String key,
        Int32 limit,
        TimeSpan window,
        DateTimeOffset now) {
        Counter updated;
        while (true) {
            if (counters.TryGetValue(key, out var current)) {
                updated = now >= current.ExpiresAt
                    ? new Counter(now.Add(window), 1)
                    : current with { Count = current.Count + 1 };
                if (counters.TryUpdate(key, updated, current)) {
                    break;
                }
            } else {
                updated = new Counter(now.Add(window), 1);
                if (!counters.TryAdd(key, updated)) {
                    continue;
                }

                break;
            }
        }

        if (counters.Count > capacity) {
            Trim(counters, evictionGate, capacity, now);
        }

        return updated.Count <= limit;
    }

    private static void Trim(
        ConcurrentDictionary<String, Counter> counters,
        Object evictionGate,
        Int32 capacity,
        DateTimeOffset now) {
        lock (evictionGate) {
            if (counters.Count <= capacity) {
                return;
            }

            foreach (var expired in counters.Where(item => item.Value.ExpiresAt <= now)) {
                ((ICollection<KeyValuePair<String, Counter>>) counters).Remove(expired);
            }

            var toRemove = counters.Count - capacity + (capacity / 10);
            if (toRemove <= 0) {
                return;
            }

            foreach (var oldest in counters.OrderBy(item => item.Value.ExpiresAt).Take(toRemove)) {
                ((ICollection<KeyValuePair<String, Counter>>) counters).Remove(oldest);
            }
        }
    }

    private static String Hash(String value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
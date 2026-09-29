using System.Diagnostics.Metrics;

namespace logic;

public static class ConcurrencyRetryMetrics {
    private static readonly Meter Meter = new("MoneyGestor.Persistence", "1.0.0");
    private static readonly Counter<long> RetryCounter = Meter.CreateCounter<long>(
        "moneygestor.concurrency.retries",
        description: "Concurrent database writes retried by the application.");
    private static long total;

    public static long Total => Interlocked.Read(ref total);

    public static void RecordRetry() {
        Interlocked.Increment(ref total);
        RetryCounter.Add(1);
    }
}

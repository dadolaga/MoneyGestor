using System.Diagnostics.Metrics;

namespace logic;

public static class ConcurrencyRetryMetrics {
    private static readonly Meter Meter = new("MoneyGestor.Persistence", "1.0.0");
    private static readonly Counter<Int64> RetryCounter = Meter.CreateCounter<Int64>(
        "moneygestor.concurrency.retries",
        description: "Concurrent database writes retried by the application.");
    private static Int64 TotalCount;

    public static Int64 Total => Interlocked.Read(ref TotalCount);

    public static void RecordRetry() {
        Interlocked.Increment(ref TotalCount);
        RetryCounter.Add(1);
    }
}
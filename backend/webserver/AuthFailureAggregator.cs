namespace webserver;

internal sealed class AuthFailureAggregator(ILogger<AuthFailureAggregator> logger) : BackgroundService {
    private long pending;

    public void Record() => Interlocked.Increment(ref pending);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        try {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                Flush();
        } catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) {
            Flush();
        }
    }

    private void Flush() {
        var count = Interlocked.Exchange(ref pending, 0);
        if (count > 0) {
            logger.LogWarning(new EventId(1401, "AuthenticationFailuresAggregated"),
                "Authentication failures observed in the previous interval: {FailureCount}", count);
        }
    }
}

using System.Diagnostics;

namespace webserver;

public sealed class ObservabilityMetrics {
    private static readonly Double[] BucketBoundsMilliseconds = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    private readonly Int64[] requestDurationBuckets = new Int64[BucketBoundsMilliseconds.Length + 1];
    private Int64 requests;
    private Int64 errors;
    private Int64 authenticationRejects;
    private Int64 databaseFailures;
    private Int64 durationSamples;
    private Int64 durationSumMicroseconds;

    public void RecordRequest(Int32 statusCode, Double elapsedMilliseconds) {
        Interlocked.Increment(ref requests);
        if (statusCode >= 400) {
            Interlocked.Increment(ref errors);
        }

        if (statusCode == StatusCodes.Status401Unauthorized) {
            Interlocked.Increment(ref authenticationRejects);
        }

        Interlocked.Increment(ref durationSamples);
        Interlocked.Add(ref durationSumMicroseconds, (Int64) (elapsedMilliseconds * 1000));
        var bucket = Array.FindIndex(BucketBoundsMilliseconds, bound => elapsedMilliseconds <= bound);
        Interlocked.Increment(ref requestDurationBuckets[bucket < 0 ? requestDurationBuckets.Length - 1 : bucket]);
    }

    public void RecordDatabaseFailure() => Interlocked.Increment(ref databaseFailures);

    public String RenderPrometheus() {
        var builder = new System.Text.StringBuilder();
        AppendCounter(builder, "moneygestor_http_requests_total", "Total HTTP requests.", Interlocked.Read(ref requests));
        AppendCounter(builder, "moneygestor_http_errors_total", "HTTP responses with status 400 or greater.", Interlocked.Read(ref errors));
        AppendCounter(builder, "moneygestor_auth_rejects_total", "Rejected authentication responses.", Interlocked.Read(ref authenticationRejects));
        AppendCounter(builder, "moneygestor_database_probe_failures_total", "Database readiness probe failures.", Interlocked.Read(ref databaseFailures));
        AppendCounter(builder, "moneygestor_concurrency_retries_total", "Retried concurrent write attempts.", logic.ConcurrencyRetryMetrics.Total);

        const String name = "moneygestor_http_request_duration_milliseconds";
        builder.Append("# HELP ").Append(name).AppendLine(" HTTP request duration in milliseconds.");
        builder.Append("# TYPE ").Append(name).AppendLine(" histogram");
        Int64 cumulative = 0;
        for (var index = 0; index < BucketBoundsMilliseconds.Length; index++) {
            cumulative += Interlocked.Read(ref requestDurationBuckets[index]);
            builder.Append(name).Append("_bucket{le=\"").Append(BucketBoundsMilliseconds[index].ToString(System.Globalization.CultureInfo.InvariantCulture))
                .Append("\"} ").Append(cumulative).AppendLine();
        }

        cumulative += Interlocked.Read(ref requestDurationBuckets[^1]);
        builder.Append(name).Append("_bucket{le=\"+Inf\"} ").Append(cumulative).AppendLine();
        builder.Append(name).Append("_sum ").AppendLine((Interlocked.Read(ref durationSumMicroseconds) / 1000d)
            .ToString(System.Globalization.CultureInfo.InvariantCulture));
        builder.Append(name).Append("_count ").AppendLine(Interlocked.Read(ref durationSamples).ToString(System.Globalization.CultureInfo.InvariantCulture));
        return builder.ToString();
    }

    private static void AppendCounter(System.Text.StringBuilder builder, String name, String help, Int64 value) {
        builder.Append("# HELP ").Append(name).Append(' ').AppendLine(help);
        builder.Append("# TYPE ").Append(name).AppendLine(" counter");
        builder.Append(name).Append(' ').AppendLine(value.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }
}

internal sealed class ObservabilityMetricsMiddleware(
    RequestDelegate next,
    ObservabilityMetrics metrics,
    AuthFailureAggregator authFailures,
    Microsoft.Extensions.Options.IOptions<ObservabilityOptions> options) {
    public async Task InvokeAsync(HttpContext context) {
        if (options.Value.MetricsEnabled && context.Request.Path.Equals(options.Value.MetricsPath, StringComparison.OrdinalIgnoreCase)) {
            await next(context);
            return;
        }

        var started = Stopwatch.GetTimestamp();
        try {
            await next(context);
        } finally {
            var elapsed = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
            metrics.RecordRequest(context.Response.StatusCode, elapsed);
            if (context.Response.StatusCode == StatusCodes.Status401Unauthorized) {
                authFailures.Record();
            }
        }
    }
}
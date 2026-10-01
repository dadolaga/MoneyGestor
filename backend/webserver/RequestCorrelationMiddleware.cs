using System.Diagnostics;
using System.Text.RegularExpressions;

namespace webserver;

internal sealed class RequestCorrelationMiddleware(RequestDelegate next, ILogger<RequestCorrelationMiddleware> logger) {
    private static readonly Regex ValidExternalId = new("^[A-Za-z0-9._-]{1,64}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public async Task InvokeAsync(HttpContext context) {
        var traceId = Activity.Current?.TraceId.ToString();
        if (String.IsNullOrWhiteSpace(traceId) || traceId.All(character => character == '0')) {
            traceId = ActivityTraceId.CreateRandom().ToString();
        }

        var correlationId = Guid.NewGuid().ToString("N");
        var externalCorrelationId = context.Request.Headers["X-Correlation-ID"].ToString();
        var acceptedExternalId = ValidExternalId.IsMatch(externalCorrelationId) ? externalCorrelationId : null;

        context.TraceIdentifier = traceId;
        context.Items["CorrelationId"] = correlationId;
        context.Items["ExternalCorrelationId"] = acceptedExternalId;
        context.Response.OnStarting(() => {
            context.Response.Headers["X-Trace-ID"] = traceId;
            context.Response.Headers["X-Correlation-ID"] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<String, Object?> {
            ["TraceId"] = traceId,
            ["CorrelationId"] = correlationId,
            ["ExternalCorrelationId"] = acceptedExternalId
        })) {
            await next(context);
        }
    }
}
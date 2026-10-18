using Microsoft.AspNetCore.Http.Extensions;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace webserver;

internal sealed partial class RequestCorrelationMiddleware(RequestDelegate next, ILogger<RequestCorrelationMiddleware> logger) {
    private static readonly Regex ValidExternalId = MyRegex();

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
            if (!logger.IsEnabled(LogLevel.Debug)) {
                await next(context);
                return;
            }

            var request = context.Request;
            // Include the absolute URL without query parameters, which may contain account tokens.
            var requestUrl = UriHelper.BuildAbsolute(request.Scheme, request.Host, request.PathBase, request.Path);
            var started = Stopwatch.GetTimestamp();
            logger.LogDebug(new EventId(1500, "HttpRequestStarted"),
                "Incoming request: {RequestMethod} {RequestUrl}. Protocol: {RequestProtocol}.",
                request.Method, requestUrl, request.Protocol);

            try {
                await next(context);
            } catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) {
                logger.LogDebug(new EventId(1502, "HttpRequestAborted"),
                    "Request {RequestMethod} {RequestUrl} was canceled by the client after {ElapsedMilliseconds:0.0000} ms.",
                    request.Method, requestUrl, Stopwatch.GetElapsedTime(started).TotalMilliseconds);
                throw;
            } catch (Exception) {
                logger.LogDebug(new EventId(1503, "HttpRequestFailed"),
                    "Request {RequestMethod} {RequestUrl} failed with an unhandled error after {ElapsedMilliseconds:0.0000} ms.",
                    request.Method, requestUrl, Stopwatch.GetElapsedTime(started).TotalMilliseconds);
                throw;
            }

            logger.LogDebug(new EventId(1501, "HttpRequestCompleted"),
                "Response for {RequestMethod} {RequestUrl}: HTTP status {StatusCode}, duration {ElapsedMilliseconds:0.0000} ms. "
                    + "Endpoint: {Endpoint}. Authentication: {AuthenticationState}. Content type: {ResponseContentType}.",
                request.Method, requestUrl, context.Response.StatusCode, Stopwatch.GetElapsedTime(started).TotalMilliseconds,
                context.GetEndpoint()?.DisplayName ?? "no endpoint selected",
                context.User.Identity?.IsAuthenticated == true ? "authenticated" : "anonymous",
                context.Response.ContentType ?? "not specified");
        }
    }

    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$", RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex MyRegex();
}
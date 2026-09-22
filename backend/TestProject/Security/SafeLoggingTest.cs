using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ExportImportApplication;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using webserver.Controllers;

namespace TestProject.Security;

[TestFixture]
[NonParallelizable]
internal sealed class SafeLoggingTest {
    private Serilog.ILogger previousLogger = null!;
    private CollectingSink sink = null!;

    [SetUp]
    public void CaptureLogs() {
        previousLogger = Log.Logger;
        sink = new CollectingSink();
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Verbose()
            .WriteTo.Sink(sink)
            .CreateLogger();
    }

    [TearDown]
    public void RestoreLogger() {
        (Log.Logger as IDisposable)?.Dispose();
        Log.Logger = previousLogger;
    }

    [Test]
    public void ResponseLogContainsCorrelationMetadataButNotResponsePayload() {
        const String password = "SEC10_PASSWORD_SENTINEL";
        const String token = "SEC10_TOKEN_SENTINEL";
        const String description = "SEC10_FINANCIAL_DESCRIPTION_SENTINEL";
        const String traceId = "sec10-trace-id";

        var httpContext = new DefaultHttpContext {
            TraceIdentifier = traceId
        };
        httpContext.Request.Path = "/user/login";

        var controller = new TestController {
            ControllerContext = new ControllerContext {
                HttpContext = httpContext
            }
        };

        controller.Respond(new {
            Password = password,
            Token = token,
            Description = description
        });

        var renderedLog = sink.RenderedLog;
        Assert.Multiple(() => {
            Assert.That(renderedLog, Does.Contain("/user/login"));
            Assert.That(renderedLog, Does.Contain(traceId));
            Assert.That(renderedLog, Does.Contain("200"));
            Assert.That(renderedLog, Does.Not.Contain(password));
            Assert.That(renderedLog, Does.Not.Contain(token));
            Assert.That(renderedLog, Does.Not.Contain(description));
        });
    }

    [Test]
    public void ImportFailureLogContainsExceptionTypeButNotExceptionMessage() {
        const String secretInException = "SEC10_IMPORT_SECRET_SENTINEL";

        SafeLog.Error("Import", new InvalidDataException(secretInException));

        var renderedLog = sink.RenderedLog;
        Assert.Multiple(() => {
            Assert.That(renderedLog, Does.Contain("Import"));
            Assert.That(renderedLog, Does.Contain(nameof(InvalidDataException)));
            Assert.That(renderedLog, Does.Not.Contain(secretInException));
        });
    }

    [Test]
    public void DatabaseLoggingRequiresDevelopmentAndTrace() {
        Assert.Multiple(() => {
            Assert.That(
                webserver.Program.ShouldEnableDatabaseLogging(
                    isDevelopment: false,
                    configuredLevel: LogEventLevel.Verbose),
                Is.False,
                "Production must never enable database logging, even at Trace.");
            Assert.That(
                webserver.Program.ShouldEnableDatabaseLogging(
                    isDevelopment: true,
                    configuredLevel: LogEventLevel.Debug),
                Is.False);
            Assert.That(
                webserver.Program.ShouldEnableDatabaseLogging(
                    isDevelopment: true,
                    configuredLevel: LogEventLevel.Verbose),
                Is.True);
        });
    }

    private sealed class TestController : MoneyMenagerController {
        internal IActionResult Respond(Object payload) => OkResponse(payload, "safe message");
    }

    private sealed class CollectingSink : ILogEventSink {
        private readonly List<LogEvent> events = new();

        internal String RenderedLog => String.Join(
            Environment.NewLine,
            events.Select(logEvent => logEvent.RenderMessage()));

        public void Emit(LogEvent logEvent) => events.Add(logEvent);
    }
}

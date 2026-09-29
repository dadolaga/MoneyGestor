using Serilog;
using Serilog.Core;
using Serilog.Events;
using Serilog.Debugging;

namespace webserver;

internal static class LoggerFactory {
    public static Logger Create(LogOptions options) {
        const String outputFormat = "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u4}] {TraceId} {CorrelationId} {Message:lj}{NewLine}{Exception}";

        var configuration = new LoggerConfiguration()
            .MinimumLevel.Is(options.GetLevel())
            .Enrich.FromLogContext();

        foreach (var (category, level) in options.Override)
            configuration.MinimumLevel.Override(category, Enum.Parse<LogEventLevel>(level, true));

        if (options.Output.Console)
            configuration.WriteTo.Console(outputTemplate: outputFormat);

        if (options.Output.File != null) {
            SelfLog.Enable(message => Console.Error.WriteLine("Serilog sink error: " + message));
            var file = options.Output.File;
            var path = Path.Combine(file.Path, $"{file.FileName}_.log");
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
            configuration.WriteTo.File(
                path: path,
                rollingInterval: Enum.Parse<RollingInterval>(file.RollingInterval, true),
                fileSizeLimitBytes: file.FileSizeLimitBytes,
                rollOnFileSizeLimit: file.RollOnFileSizeLimit,
                retainedFileCountLimit: file.RetainedFileCountLimit,
                outputTemplate: outputFormat);
        }

        return configuration.CreateLogger();
    }
}

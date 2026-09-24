using Serilog;
using Serilog.Core;

namespace webserver;

internal static class LoggerFactory {
    public static Logger Create(LogOptions options) {
        const String outputFormat = "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u4}] {Message:lj}{NewLine}{Exception}";

        var configuration = new LoggerConfiguration()
            .MinimumLevel.Is(options.GetLevel());

        if (options.Output.Console) {
            configuration.WriteTo.Console(outputTemplate: outputFormat);
        }

        if (options.Output.File != null) {
            configuration.WriteTo.File(
                path: $"{Path.Combine(options.Output.File.Path, options.Output.File.FileName)}_.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14,
                outputTemplate: outputFormat);
        }

        return configuration.CreateLogger();
    }
}

using Serilog;
using Serilog.Core;
using System.Runtime.CompilerServices;

namespace webserver {
    internal class LoggerFactory {
        private static Logger? logger_;

        public static Logger Create() {
            const String outputFormat = "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u4}] {Message:lj}{NewLine}{Exception}";

            if (logger_ == null) {
                var loggerConfiguration = new LoggerConfiguration();

                loggerConfiguration.MinimumLevel.Is(Settings.Log.Level);

                if (Settings.Log.Output.Console) {
                    loggerConfiguration.WriteTo.Console();
                }

                if (Settings.Log.Output.File) {
                    loggerConfiguration.WriteTo.File(
                        path: $"{Path.Combine(Settings.Log.Output.FolderPath!, Settings.Log.Output.LogName!)}_.log",
                        rollingInterval: RollingInterval.Day,
                        outputTemplate: outputFormat);
                }

                logger_ = loggerConfiguration.CreateLogger();
            }

            return logger_;
        }
    }
}
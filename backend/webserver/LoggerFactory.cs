using Serilog;
using Serilog.Core;
using System.Runtime.CompilerServices;

namespace webserver {
    internal class LoggerFactory {
        private static Logger? logger_;

        public static Logger Create() {
            const string outputFormat = "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u4}] {Message:lj}{NewLine}{Exception}";

            if (logger_ == null) {
                logger_ = new LoggerConfiguration()
                    .MinimumLevel.Debug()
                    .WriteTo.Console(outputTemplate: outputFormat)
                    .WriteTo.File("log/backend_.log", rollingInterval: RollingInterval.Day, outputTemplate: outputFormat)
                    .CreateLogger();
            }

            return logger_;
        }
    }
}

using database;
using ExportImportApplication;
using ExportImportApplication.Export;
using ExportImportApplication.Models;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Sinks.SystemConsole.Themes;
using System.Text.Json.Nodes;

internal class Program {
    private static void Main(String[] args) {
        var setting = SettingsReader.Read();
        ApplySettings(setting);

        var commandLineManager = new CommandLineManager();
        commandLineManager.Check(args);

        if (commandLineManager.ApplicationType == EApplicationType.Export) {
            IExport export = new Export(commandLineManager.FilePath ?? "./export.zip");
            export.Export();
        } else {
            ImportManager importManager = new(commandLineManager.FilePath ?? "./export.zip");
            importManager.Import();
        }

        Log.CloseAndFlush();
    }

    private static void ApplySettings(Settings settings) {
        ApplyLogSettings(settings.Log);

        MoneyGestorContext.Initialize(settings.Database.Name, settings.Database.User, settings.Database.Password, false);
    }

    private static void ApplyLogSettings(SettingsLog settingsLog) {
        var loggerConfig = new LoggerConfiguration();

        switch (settingsLog.Level) {
            case LogLevel.Critical:
                loggerConfig.MinimumLevel.Fatal();
                break;

            case LogLevel.Error:
                loggerConfig.MinimumLevel.Error();
                break;

            case LogLevel.Warning:
                loggerConfig.MinimumLevel.Warning();
                break;

            case LogLevel.Information:
                loggerConfig.MinimumLevel.Information();
                break;

            case LogLevel.Trace:
            case LogLevel.Debug:
                loggerConfig.MinimumLevel.Verbose();
                break;

            default:
                loggerConfig.MinimumLevel.Information();
                break;
        }

        if (settingsLog.Output.Console ?? false) {
            loggerConfig.WriteTo.Console();
        }

        if (settingsLog.Output.File != null) {
            loggerConfig.WriteTo.File(
                path: Path.Combine(settingsLog.Output.File.Path, settingsLog.Output.File.FileName),
                rollingInterval: RollingInterval.Day,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
            );
        }

        Log.Logger = loggerConfig.CreateLogger();
    }
}
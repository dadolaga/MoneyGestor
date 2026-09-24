using database;
using ExportImportApplication;
using ExportImportApplication.Export;
using ExportImportApplication.Models;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;
using Serilog;
using Serilog.Sinks.SystemConsole.Themes;
using System.Text.Json.Nodes;

internal class Program {
    private static void Main(String[] args) {
        var commandLineManager = new CommandLineManager();
        commandLineManager.Check(args);

        var setting = SettingsReader.Read();
        ApplyLogSettings(setting.Log);
        var databaseOptions = CreateDatabaseOptions(setting.Database);

        if (commandLineManager.ApplicationType == EApplicationType.Export) {
            IExport export = new Export(commandLineManager.FilePath ?? "./export.zip", databaseOptions);
            export.Export();
        } else {
            ImportManager importManager = new(commandLineManager.FilePath ?? "./export.zip", databaseOptions);
            importManager.Import();
        }

        Log.CloseAndFlush();
    }

    private static DbContextOptions<MoneyGestorContext> CreateDatabaseOptions(SettingsDatabase settings) {
        var connectionString = new MySqlConnectionStringBuilder {
            Server = settings.Host,
            Port = settings.Port,
            Database = settings.Name,
            UserID = settings.User,
            Password = settings.Password
        }.ConnectionString;
        return new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(connectionString)
            .Options;
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
                retainedFileCountLimit: 14,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}"
            );
        }

        Log.Logger = loggerConfig.CreateLogger();
    }
}

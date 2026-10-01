using database;
using MySql.Data.MySqlClient;
using Serilog.Events;

namespace webserver;

public sealed class DatabaseOptions {
    public const String SectionName = "database";

    public String Host { get; set; } = String.Empty;
    public UInt16 Port { get; set; }
    public String Name { get; set; } = String.Empty;
    public String User { get; set; } = String.Empty;
    public String Password { get; set; } = String.Empty;
    public DatabaseBootstrapMode BootstrapMode { get; set; } = DatabaseBootstrapMode.Disabled;

    public String CreateConnectionString() => new MySqlConnectionStringBuilder {
        Server = Host,
        Port = Port,
        Database = Name,
        UserID = User,
        Password = Password
    }.ConnectionString;

    internal static Boolean IsValid(DatabaseOptions options) =>
        !String.IsNullOrWhiteSpace(options.Host) &&
        options.Port > 0 &&
        !String.IsNullOrWhiteSpace(options.Name) &&
        !String.IsNullOrWhiteSpace(options.User) &&
        !String.IsNullOrWhiteSpace(options.Password) &&
        Enum.IsDefined(options.BootstrapMode);
}

public sealed class LogOptions {
    public const String SectionName = "log";

    public String Level { get; set; } = String.Empty;
    public LogOutputOptions Output { get; set; } = new();
    public Dictionary<String, String> Override { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Boolean DiagnosticEfLogging { get; set; }

    public LogEventLevel GetLevel() => Level.Trim().ToLowerInvariant() switch {
        "critical" or "fatal" => LogEventLevel.Fatal,
        "error" => LogEventLevel.Error,
        "warning" => LogEventLevel.Warning,
        "information" => LogEventLevel.Information,
        "debug" => LogEventLevel.Debug,
        "trace" or "verbose" => LogEventLevel.Verbose,
        _ => throw new InvalidOperationException("The configured log level is invalid.")
    };

    internal static Boolean IsValid(LogOptions options) {
        try {
            _ = options.GetLevel();
        } catch (InvalidOperationException) {
            return false;
        }

        var validFile = options.Output.File == null || (
            !String.IsNullOrWhiteSpace(options.Output.File.Path) &&
            !String.IsNullOrWhiteSpace(options.Output.File.FileName) &&
            Enum.TryParse<Serilog.RollingInterval>(options.Output.File.RollingInterval, true, out var interval) &&
            Enum.IsDefined(interval) &&
            options.Output.File.RetainedFileCountLimit > 0 &&
            options.Output.File.FileSizeLimitBytes > 0 &&
            !Path.GetInvalidFileNameChars().Any(options.Output.File.FileName.Contains));
        return validFile &&
            options.Override.All(entry => !String.IsNullOrWhiteSpace(entry.Key) &&
                Enum.TryParse<LogEventLevel>(entry.Value, true, out var level) && Enum.IsDefined(level)) &&
            (options.Output.Console || options.Output.File != null);
    }
}

public sealed class LogOutputOptions {
    public Boolean Console { get; set; }
    public LogFileOptions? File { get; set; }
}

public sealed class LogFileOptions {
    public String Path { get; set; } = String.Empty;
    public String FileName { get; set; } = String.Empty;
    public String RollingInterval { get; set; } = "Day";
    public Int32 RetainedFileCountLimit { get; set; } = 14;
    public Int64 FileSizeLimitBytes { get; set; } = 104857600;
    public Boolean RollOnFileSizeLimit { get; set; } = true;
}

public sealed class ObservabilityOptions {
    public const String SectionName = "observability";
    public Int32 DatabaseReadinessTimeoutSeconds { get; set; } = 2;
    public Boolean MetricsEnabled { get; set; } = true;
    public String MetricsPath { get; set; } = "/metrics";

    internal static Boolean IsValid(ObservabilityOptions options) =>
        options.DatabaseReadinessTimeoutSeconds is >= 1 and <= 30 &&
        !String.IsNullOrWhiteSpace(options.MetricsPath) &&
        options.MetricsPath.Length <= 128 &&
        options.MetricsPath.StartsWith('/') && !options.MetricsPath.StartsWith("//") &&
        options.MetricsPath is not "/health/live" and not "/health/ready" &&
        options.MetricsPath.Skip(1).All(character =>
            Char.IsAsciiLetterOrDigit(character) || character is '/' or '-' or '_');
}

public sealed class SecurityOptions {
    public const String SectionName = "security";

    public String[] AllowedOrigins { get; set; } = [];

    internal static Boolean IsValid(SecurityOptions options) =>
        options.AllowedOrigins.Length > 0 &&
        options.AllowedOrigins.All(origin => Uri.TryCreate(origin, UriKind.Absolute, out _));
}

public sealed class EmailOptions {
    public const String SectionName = "email";

    public String? Host { get; set; }
    public Int32 Port { get; set; } = 587;
    public String? Username { get; set; }
    public String? Password { get; set; }
    public String? From { get; set; }
    public Boolean UseSsl { get; set; } = true;
    public String FrontendBaseUrl { get; set; } = String.Empty;
    public Boolean IsConfigured => !String.IsNullOrWhiteSpace(Host) && !String.IsNullOrWhiteSpace(From);

    internal static Boolean IsValid(EmailOptions options) =>
        options.Port > 0 &&
        Uri.TryCreate(options.FrontendBaseUrl, UriKind.Absolute, out _);
}
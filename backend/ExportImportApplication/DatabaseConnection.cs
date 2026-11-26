using MySql.Data.MySqlClient;
using System.Text.Json;

namespace ExportImportApplication;

internal static class DatabaseConnection {
    public static Boolean TryRead(out MySqlConnectionStringBuilder connection, out String? error, Boolean requireSettingsFile = false) {
        connection = new MySqlConnectionStringBuilder();
        error = null;
        var settingsPath = Environment.GetEnvironmentVariable("BACKEND_APP_SETTINGS");
        var configured = Environment.GetEnvironmentVariable("MONEYGESTOR_ADMIN_CONNECTION_STRING");
        // Preserve standalone administrative callers; an explicit JSON path always wins.
        if (!requireSettingsFile && String.IsNullOrWhiteSpace(settingsPath) && !String.IsNullOrWhiteSpace(configured)) {
            try {
                connection = new MySqlConnectionStringBuilder(configured);
                return true;
            } catch (Exception exception) when (exception is ArgumentException or FormatException or OverflowException) {
                error = "MONEYGESTOR_ADMIN_CONNECTION_STRING is not a valid MySQL connection string. Check its keys and syntax privately.";
                return false;
            }
        }

        DatabaseSettings? database;
        try {
            using var stream = File.OpenRead(String.IsNullOrWhiteSpace(settingsPath) ? "./settings.json" : settingsPath);
            database = JsonSerializer.Deserialize<ApplicationSettings>(stream, new JsonSerializerOptions {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
                ReadCommentHandling = JsonCommentHandling.Skip
            })?.Database;
        } catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException or ArgumentException or NotSupportedException) {
            // Parser exception messages can contain credentials from malformed JSON.
            error = "Cannot read application settings. Verify BACKEND_APP_SETTINGS (default ./settings.json), file permissions and JSON syntax. File contents were not logged.";
            return false;
        }
        if (database == null || String.IsNullOrWhiteSpace(database.Host) || String.IsNullOrWhiteSpace(database.Name) ||
            String.IsNullOrWhiteSpace(database.User) || String.IsNullOrWhiteSpace(database.Password) || database.Port == 0) {
            error = "Application settings must contain database.host, database.port (1-65535), database.name, database.user and database.password.";
            return false;
        }

        connection = new MySqlConnectionStringBuilder {
            Server = database.Host,
            Port = database.Port,
            Database = database.Name,
            UserID = database.User,
            Password = database.Password
        };
        return true;
    }

    private sealed class ApplicationSettings {
        public DatabaseSettings? Database { get; set; }
    }

    private sealed class DatabaseSettings {
        public String Host { get; set; } = String.Empty;
        public UInt16 Port { get; set; }
        public String Name { get; set; } = String.Empty;
        public String User { get; set; } = String.Empty;
        public String Password { get; set; } = String.Empty;
    }
}

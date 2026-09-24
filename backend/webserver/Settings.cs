using Microsoft.EntityFrameworkCore.Internal;
using System.Text.Json.Nodes;

namespace webserver {
    public class Settings {
        public static SettingsLog Log { private set; get; } = new SettingsLog();
        public static SettingsDatabase Database { private set; get; } = new SettingsDatabase();
        public static SettingsSecurity Security { private set; get; } = new SettingsSecurity();
        public static SettingsEmail Email { private set; get; } = new SettingsEmail();

        public static void Load(String? path = null) {
            path ??= Environment.GetEnvironmentVariable("BACKEND_APP_SETTINGS") ?? "./settings.json";

            Console.WriteLine($"Reading setting file: {Path.GetFullPath(path)}");

            if (!File.Exists(path)) {
                Console.WriteLine($"JSON file setting not exist, file path: {Path.GetFullPath(path)}");
                Environment.Exit(1);
                return;
            }

            String jsonString = File.ReadAllText(path);

            var rootNode = JsonNode.Parse(jsonString);

            if (rootNode == null) {
                Console.WriteLine($"Error when try to read JSON setting file, file path: {Path.GetFullPath(path)}");
                Environment.Exit(1);
                return;
            }

            // Load log settings
            Log.Level = rootNode["log"]?["level"] != null ?
                ((String) rootNode["log"]?["level"]!).ToLower() switch {
                    "critical" => Serilog.Events.LogEventLevel.Fatal,
                    "fatal" => Serilog.Events.LogEventLevel.Fatal,
                    "error" => Serilog.Events.LogEventLevel.Error,
                    "warning" => Serilog.Events.LogEventLevel.Warning,
                    "information" => Serilog.Events.LogEventLevel.Information,
                    "trace" => Serilog.Events.LogEventLevel.Verbose,
                    "verbose" => Serilog.Events.LogEventLevel.Verbose,
                    "debug" => Serilog.Events.LogEventLevel.Debug,
                    _ => Serilog.Events.LogEventLevel.Information
                } : Serilog.Events.LogEventLevel.Information;

            Log.Output.Console = ((Boolean?) rootNode["log"]?["output"]?["console"]) ?? false;

            if (rootNode["log"]?["output"]?["file"] != null) {
                JsonNode logConfigFile = rootNode["log"]!["output"]!["file"]!;

                Log.Output.FolderPath = ((String?) logConfigFile["path"]) ?? ".";
                Log.Output.LogName = ((String?) logConfigFile["fileName"]) ?? "log_file_";
            }

            // Load databases settings
            Database.Server = ((String?) rootNode["database"]?["host"]) ?? "localhost";
            Database.Port = ((UInt16?) rootNode["database"]?["port"]) ?? 3306;
            Database.DatabaseName = ((String?) rootNode["database"]?["name"]) ?? "money_gestor";
            Database.User = ((String?) rootNode["database"]?["user"]) ?? "root";
            Database.Password = ((String?) rootNode["database"]?["password"]) ?? "root";
            Database.ForceUpdate = ((Boolean?) rootNode["database"]?["forceUpdate"]) ?? false;

            Security.AllowedOrigins = rootNode["security"]?["allowedOrigins"]?.AsArray()
                .Select(node => (String?)node)
                .Where(origin => !String.IsNullOrWhiteSpace(origin))
                .Cast<String>()
                .ToArray() ?? ["http://localhost:3000"];

            Email.Host = (String?)rootNode["email"]?["host"];
            Email.Port = ((Int32?)rootNode["email"]?["port"]) ?? 587;
            Email.Username = (String?)rootNode["email"]?["username"];
            Email.Password = (String?)rootNode["email"]?["password"];
            Email.From = (String?)rootNode["email"]?["from"];
            Email.UseSsl = ((Boolean?)rootNode["email"]?["useSsl"]) ?? true;
            Email.FrontendBaseUrl = ((String?)rootNode["email"]?["frontendBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
        }

        public class SettingsLog {
            public Serilog.Events.LogEventLevel Level { internal set; get; }
            public SettingsOutput Output { internal set; get; } = new SettingsOutput();

            public class SettingsOutput {
                public Boolean Console { internal set; get; }
                public Boolean File => FolderPath != null;
                public String? FolderPath { internal set; get; }
                public String? LogName { internal set; get; }
            }
        }

        public class SettingsDatabase {
            public String Server {  internal set; get; }
            public UInt16 Port { internal set; get; }
            public String DatabaseName { internal set; get; }
            public String User { internal set; get; }
            public String Password { internal set; get; }
            public Boolean ForceUpdate { internal set; get; }
        }

        public class SettingsSecurity {
            public String[] AllowedOrigins { internal set; get; } = ["http://localhost:3000"];
        }

        public class SettingsEmail {
            public String? Host { internal set; get; }
            public Int32 Port { internal set; get; } = 587;
            public String? Username { internal set; get; }
            public String? Password { internal set; get; }
            public String? From { internal set; get; }
            public Boolean UseSsl { internal set; get; } = true;
            public String FrontendBaseUrl { internal set; get; } = "http://localhost:3000";
            public Boolean IsConfigured => !String.IsNullOrWhiteSpace(Host) && !String.IsNullOrWhiteSpace(From);
        }
    }
}

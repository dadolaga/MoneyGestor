using Microsoft.EntityFrameworkCore.Internal;
using System.Text.Json.Nodes;

namespace webserver {
    public class Settings {
        public static SettingsLog Log { private set; get; } = new SettingsLog();
        public static SettingsDatabase Database { private set; get; } = new SettingsDatabase();

        public static void Load(String path = "./settings.json") {
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
            Database.DatabaseName = ((String?) rootNode["database"]?["name"]) ?? "money_gestor";
            Database.User = ((String?) rootNode["database"]?["user"]) ?? "root";
            Database.Password = ((String?) rootNode["database"]?["password"]) ?? "root";
            Database.ForceUpdate = ((Boolean?) rootNode["database"]?["forceUpdate"]) ?? false;
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
            public String DatabaseName { internal set; get; }
            public String User { internal set; get; }
            public String Password { internal set; get; }
            public Boolean ForceUpdate { internal set; get; }
        }
    }
}
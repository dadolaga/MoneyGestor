using Microsoft.EntityFrameworkCore.Internal;
using System.Text.Json.Nodes;

namespace webserver {
    public class Settings {
        public static SettingsLog Log { private set; get; } = new SettingsLog();

        public static void Load(string path = "./settings.json") {
            if (!File.Exists(path)) {
                Console.WriteLine($"JSON file setting not exist, file path: {Path.GetFullPath(path)}");
                Environment.Exit(1);
                return;
            }

            string jsonString = File.ReadAllText(path);

            JsonNode? rootNode = JsonNode.Parse(jsonString);

            if (rootNode == null) {
                Console.WriteLine($"Error when try to read JSON setting file, file path: {Path.GetFullPath(path)}");
                Environment.Exit(1);
                return;
            }

            Log.Level = rootNode["log"]?["level"] != null ? 
                ((string)rootNode["log"]?["level"]!).ToLower() switch {
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

            Log.Output.Console = ((bool?) rootNode["log"]?["output"]?["console"]) ?? false;

            if (rootNode["log"]?["output"]?["file"] != null) {
                JsonNode logConfigFile = rootNode["log"]!["output"]!["file"]!;

                Log.Output.FolderPath = ((string?) logConfigFile["path"]) ?? ".";
                Log.Output.LogName = ((string?) logConfigFile["fileName"]) ?? "log_file_";
            }
        }

        public class SettingsLog {
            public Serilog.Events.LogEventLevel Level { internal set; get; }
            public SettingsOutput Output { internal set; get; } = new SettingsOutput();

            public class SettingsOutput {
                public bool Console { internal set; get; }
                public bool File { get => FolderPath != null; }
                public string? FolderPath { internal set; get; }
                public string? LogName { internal set; get; }
            }
        }
    }
}

using ExportImportApplication.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace ExportImportApplication {
    internal class SettingsReader {
        public static Settings Read(String? path = null) {
            path ??= Environment.GetEnvironmentVariable("IMPORT_EXPORT_APP_SETTINGS") ?? "./settings.json";

            if (!File.Exists(path)) {
                throw new FileNotFoundException($"File not found in: {path}");
            }

            String jsonString = File.ReadAllText(path);

            var options = new JsonSerializerOptions {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            };

            Settings? settings = JsonSerializer.Deserialize<Settings>(jsonString, options);

            return settings ?? throw new Exception("Json file is not valid.");
        }
    }
}

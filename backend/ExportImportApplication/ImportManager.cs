using ExportImportApplication.Imports;
using ExportImportApplication.Models;
using Serilog;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace ExportImportApplication {
    internal class ImportManager {
        private String path;

        public ImportManager(String path) {
            this.path = path;
        }

        public void Import() {
            if (String.IsNullOrEmpty(path)) {
                throw new ArgumentException("File path cannot be null or empty.", nameof(path));
            }

            if (!File.Exists(path)) {
                throw new FileNotFoundException($"The file to extract was not found: {path}");
            }

            String tempFolder = ExtractInTempFolder();

            String jsonTextExportDetails = File.ReadAllText(Path.Combine(tempFolder, "export_detail.json"));

            var options = new JsonSerializerOptions {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            };
            ExportDetails? exportDetails = JsonSerializer.Deserialize<ExportDetails>(jsonTextExportDetails, options);

            if (exportDetails == null) {
                Log.Error("Parsing JSON error");
                return;
            }

            var import = ImportFactory.CreateExport(exportDetails.Version, tempFolder);

            if (import == null) {
                return;
            }

            try {
                import.Import(exportDetails);

                Log.Information("Import succed");
            } catch (Exception ex) {
                Log.Error($"Import fail: {ex.Message}", ex);
            }
        }

        protected String ExtractInTempFolder() {
            try {
                String systemTempPath = Path.GetTempPath();

                String uniqueFolderName = Path.GetFileNameWithoutExtension(path) + "_" + Path.GetRandomFileName();
                String destinationFolder = Path.Combine(systemTempPath, uniqueFolderName);

                Directory.CreateDirectory(destinationFolder);

                Log.Debug($"Extracting {path} to {destinationFolder}...");
                ZipFile.ExtractToDirectory(path, destinationFolder);

                Log.Information("File extract success in temp folder");

                return destinationFolder;
            } catch (Exception ex) {
                Console.WriteLine($"An error occurred during extraction: {ex.Message}");
                throw;
            }
        }
    }
}

using database;
using ExportImportApplication.Models;
using Microsoft.EntityFrameworkCore.Storage;
using Serilog;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Transactions;

namespace ExportImportApplication.Imports {
    internal class ImportBase {
        protected String? baseFolder;

        protected String? destinationFolder = null;
        protected ExportDetails? exportDetails = null;
        protected MoneyGestorContext? context = null;
        protected IDbContextTransaction? transaction = null;

        protected ImportBase(String? baseFolder) {
            this.baseFolder = baseFolder;
        }

        protected void ExtractInTempFolder(String filePath) {
            if (String.IsNullOrEmpty(filePath)) {
                throw new ArgumentException("File path cannot be null or empty.", nameof(filePath));
            }

            if (!File.Exists(filePath)) {
                throw new FileNotFoundException($"The file to extract was not found: {filePath}");
            }

            try {
                String systemTempPath = Path.GetTempPath();

                String uniqueFolderName = Path.GetFileNameWithoutExtension(filePath) + "_" + Path.GetRandomFileName();
                destinationFolder = Path.Combine(systemTempPath, uniqueFolderName);

                Directory.CreateDirectory(destinationFolder);

                Log.Debug($"Extracting {filePath} to {destinationFolder}...");
                ZipFile.ExtractToDirectory(filePath, destinationFolder);

                Log.Information("File extract success in temp folder");
            } catch (Exception ex) {
                Console.WriteLine($"An error occurred during extraction: {ex.Message}");
                throw;
            }
        }

        protected String RandomString(UInt16 lenght = 10) {
            const String charachter = "abcdefghijklmnopqrstuvwxyz";

            return Random.Shared.GetItems<Char>(charachter, lenght).AsSpan().ToString();
        }

        protected IList<String> RetrieveCsvFilePath(String tableName) {
            var finded = exportDetails?.Tables.FirstOrDefault(t => t.Name == tableName);

            return finded == null ? new List<String> { } : finded.FilePaths;
        }
    }
}

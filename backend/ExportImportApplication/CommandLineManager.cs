using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.CommandLine;

namespace ExportImportApplication {
    internal enum EApplicationType {
        Export,
        Import
    }

    internal class CommandLineManager {
        public EApplicationType ApplicationType { get; private set; }
        public String? FilePath { get; private set; }

        private RootCommand rootCommand;

        public CommandLineManager() {
            rootCommand = new RootCommand("Strumento CLI per il backup e ripristino Database in formato ZIP");

            var pathOptionExport = new Option<FileInfo>("--path", "-p") {
                Description = "Percorso del file ZIP."
            };

            var pathOptionImport = new Option<FileInfo>("--path", "-p") {
                Description = "Percorso del file ZIP.",
                Required = true
            };

            var exportCmd = new Command("export") {
                Description = "Esporta il database in un archivio ZIP."
            };

            exportCmd.Add(pathOptionExport);

            exportCmd.SetAction((output) => {
                FilePath = output.GetValue(pathOptionExport)?.ToString();

                ApplicationType = EApplicationType.Export;
            });

            var importCmd = new Command("import") {
                Description = "Importa i dati da uno ZIP al database."
            };
            importCmd.Add(pathOptionImport);

            importCmd.SetAction((output) => {
                String path = output.GetValue(pathOptionImport)?.ToString() ?? ".";

                ApplicationType = EApplicationType.Import;
                FilePath = Path.Combine(Directory.GetCurrentDirectory(), path);
            });

            rootCommand.Add(exportCmd);
            rootCommand.Add(importCmd);
        }

        public void Check(String[] args) => rootCommand.Parse(args).Invoke();
    }
}

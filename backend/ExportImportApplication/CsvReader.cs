using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication {
    internal class CsvReader {
        private String? baseFolder;
        private IEnumerable<String> csvFilesPath;
        private Char csvSplitter;

        public CsvReader(IEnumerable<String> csvFilesPath, String? baseFolder = null, Char csvSplitter = ';') {
            this.csvFilesPath = csvFilesPath;
            this.baseFolder = baseFolder;
            this.csvSplitter = csvSplitter;
        }

        public IEnumerable<String[]> ReadAll() {
            foreach (var csvFile in this.csvFilesPath) {
                var filePath = baseFolder != null ? Path.Combine(baseFolder, csvFile) : csvFile;

                using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var reader = new StreamReader(fs, Encoding.UTF8)) {
                    String? line = null;

                    do {
                        line = reader.ReadLine();

                        if (line != null) {
                            yield return line.Split(csvSplitter);
                        }
                    } while (line != null);
                }
            }
        }
    }
}

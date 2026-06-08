using ExportImportApplication.Export;
using Org.BouncyCastle.Cms;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication.Imports {
    internal static class ImportFactory {
        public static IImport? CreateExport(String version, String? baseFolder) {
            switch (version) {
                case "1.0.0":
                    return new Import1_0_0(baseFolder);
                default:
                    Log.Error($"Version {version} is not implemented");
                    return null;
            }
        }
    }
}

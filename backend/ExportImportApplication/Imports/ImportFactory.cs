using database;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace ExportImportApplication.Imports;

internal static class ImportFactory {
    public static IImport? CreateExport(
        String version,
        String? baseFolder,
        DbContextOptions<MoneyGestorContext> databaseOptions) {
        switch (version) {
            case "1.0.0":
                return new Import1_0_0(baseFolder, databaseOptions);
            default:
                Log.Error("Version {Version} is not implemented", version);
                return null;
        }
    }
}

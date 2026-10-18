using database;
using ExportImportApplication;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

internal static class Program {
    private static async Task<Int32> Main(String[] args) {
        if (args.Length == 1 && args[0] == "--help") {
            PrintUsage();
            return 0;
        }

        if (!TryParse(args, out var operation, out var databaseName, out var archivePath)) {
            PrintUsage();
            return 2;
        }

        using var cancellation = new CancellationTokenSource();
        Console.CancelKeyPress += (_, signal) => { signal.Cancel = true; cancellation.Cancel(); };
        try {
            var configured = Environment.GetEnvironmentVariable("MONEYGESTOR_ADMIN_CONNECTION_STRING");
            if (String.IsNullOrWhiteSpace(configured)) {
                Console.Error.WriteLine("MONEYGESTOR_ADMIN_CONNECTION_STRING must be supplied privately. No settings file is read.");
                return 2;
            }
            var connection = new MySqlConnectionStringBuilder(configured);
            if (String.IsNullOrWhiteSpace(connection.Server) || String.IsNullOrWhiteSpace(connection.UserID) ||
                String.IsNullOrWhiteSpace(databaseName) || connection.Database != databaseName) {
                Console.Error.WriteLine("The explicit --database name must match the configured administrative destination.");
                return 2;
            }
            // Never enable provider logging or emit exception messages containing data/connection details.
            Console.WriteLine($"Operation: {operation}; server: {connection.Server}; port: {connection.Port}; database: {connection.Database}.");
            String? deletionConfirmation = null;
            if (operation == "delete") {
                Console.WriteLine("Stop all application writers. This permanently deletes the entire database and its data.");
                Console.Write("Type the exact database name to confirm deletion: ");
                deletionConfirmation = await Console.In.ReadLineAsync(cancellation.Token);
                if (deletionConfirmation != databaseName) {
                    Console.Error.WriteLine("Deletion cancelled: confirmation did not match the database name.");
                    return 1;
                }
            }
            await using var database = new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
                .UseMySQL(connection.ConnectionString).Options);
            if (operation == "initialize") {
                await DatabaseTransfer.InitializeAsync(database, cancellation.Token);
            } else if (operation == "export") {
                await DatabaseTransfer.ExportAsync(database, archivePath!, TimeProvider.System, cancellation.Token);
            } else if (operation == "import") {
                await DatabaseTransfer.ImportAsync(database, archivePath!, cancellation.Token);
            } else {
                await DatabaseTransfer.DeleteAsync(database, deletionConfirmation!, cancellation.Token);
            }
            Console.WriteLine("Operation completed successfully. Application configuration was not changed.");
            return 0;
        } catch (OperationCanceledException) {
            Console.Error.WriteLine("Operation cancelled. The destination was not promoted; inspect it before retrying.");
            return 1;
        } catch (Exception exception) when (exception is InvalidDataException or InvalidOperationException) {
            Console.Error.WriteLine(exception.Message);
            return 1;
        } catch (Exception exception) {
            Console.Error.WriteLine($"Operation failed ({exception.GetType().Name}). No destination was promoted. Verify archive, target, permissions and connectivity; retain failed output for inspection.");
            return 1;
        }
    }

    private static Boolean TryParse(String[] args, out String operation, out String databaseName, out String? archivePath) {
        operation = args.FirstOrDefault() ?? String.Empty;
        databaseName = String.Empty;
        archivePath = null;
        var maintenance = false;
        for (var index = 1; index < args.Length; index++) {
            if (args[index] == "--maintenance" && !maintenance) { maintenance = true; continue; }
            if (index + 1 >= args.Length) { return false; }
            if (args[index] == "--database" && databaseName.Length == 0) { databaseName = args[++index]; }
            else if (args[index] == "--file" && archivePath == null) { archivePath = args[++index]; }
            else { return false; }
        }
        return databaseName.Length > 0 && (operation switch {
            "initialize" or "delete" => archivePath == null && !maintenance,
            "export" => !String.IsNullOrWhiteSpace(archivePath) && maintenance,
            "import" => !String.IsNullOrWhiteSpace(archivePath) && !maintenance,
            _ => false
        });
    }

    private static void PrintUsage() {
        Console.Error.WriteLine("Usage: initialize --database NAME | export --database NAME --file ARCHIVE.zip --maintenance | import --database NAME --file ARCHIVE.zip | delete --database NAME");
        Console.Error.WriteLine("Stop all application writers before export. --maintenance acknowledges this requirement. Use an existing empty database for initialize/import.");
        Console.Error.WriteLine("Delete permanently removes the whole database and requires typing its exact name for confirmation.");
    }
}

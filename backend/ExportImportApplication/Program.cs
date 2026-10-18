using database;
using ExportImportApplication;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

internal static class Program {
    private static async Task<Int32> Main(String[] args) {
        var terminal = new CliConsole(args.Contains("--no-color", StringComparer.Ordinal));
        if (!CliArguments.TryParse(args, out var options, out var error)) {
            terminal.Error(error!);
            terminal.PrintUsageHint(options.Operation);
            return 2;
        }

        if (options.ShowHelp) {
            terminal.PrintHelp(options.Operation);
            return 0;
        }

        var operation = options.Operation!;
        var databaseName = options.DatabaseName;
        using var cancellation = new CancellationTokenSource();
        Console.CancelKeyPress += (_, signal) => { signal.Cancel = true; cancellation.Cancel(); };
        try {
            var configured = Environment.GetEnvironmentVariable("MONEYGESTOR_ADMIN_CONNECTION_STRING");
            if (String.IsNullOrWhiteSpace(configured)) {
                terminal.Error("Missing MONEYGESTOR_ADMIN_CONNECTION_STRING. Supply the administrative connection privately in the process environment. No settings file is read.");
                terminal.PrintUsageHint(operation);
                return 2;
            }

            MySqlConnectionStringBuilder connection;
            try {
                connection = new MySqlConnectionStringBuilder(configured);
            } catch (Exception exception) when (exception is ArgumentException or FormatException or OverflowException) {
                terminal.Error("MONEYGESTOR_ADMIN_CONNECTION_STRING is not a valid MySQL connection string. Check its keys and syntax privately.");
                return 2;
            }

            if (String.IsNullOrWhiteSpace(connection.Server) || String.IsNullOrWhiteSpace(connection.UserID) ||
                String.IsNullOrWhiteSpace(databaseName) || connection.Database != databaseName) {
                terminal.Error("The connection must specify a server and user, and its Database value must exactly match --database NAME. Check the connection privately.");
                return 2;
            }
            if (operation == "export" && options.ArchivePath == null) {
                var timestamp = TimeProvider.System.GetUtcNow().ToString("yyyy-MM-dd-HHmmss", System.Globalization.CultureInfo.InvariantCulture);
                options = options with { ArchivePath = Path.Combine(".", $"export-{timestamp}.zip") };
            }

            var archivePath = options.ArchivePath;
            // Never enable provider logging or emit exception messages containing data/connection details.
            terminal.PrintTarget(options, connection.Server, connection.Port);
            String? deletionConfirmation = null;
            if (operation == "delete") {
                terminal.Warning("Stop all application writers. This permanently deletes the entire database and its data.");
                Console.WriteLine("Press Enter without a name to cancel.");
                Console.Write("Type the exact database name to confirm deletion: ");
                deletionConfirmation = await Console.In.ReadLineAsync(cancellation.Token);
                if (deletionConfirmation != databaseName) {
                    terminal.Error("Deletion cancelled: confirmation did not match the database name.");
                    return 1;
                }
            }

            terminal.PrintStarted(operation);
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

            terminal.Success(operation switch {
                "initialize" => "Database initialized and validated.",
                "export" => "ZIP archive exported successfully.",
                "import" => "Archive imported; destination validated and marked ready.",
                _ => "Database permanently deleted."
            });
            Console.WriteLine("Application configuration was not changed.");
            return 0;
        } catch (OperationCanceledException) {
            terminal.Error("Operation cancelled. Inspect the target and any partial output before retrying.");
            return 1;
        } catch (Exception exception) when (exception is InvalidDataException or InvalidOperationException) {
            terminal.Error(exception.Message);
            return 1;
        } catch (Exception exception) {
            terminal.Error($"Operation failed ({exception.GetType().Name}). Verify archive, target, permissions and connectivity; inspect the target and retain any partial output before retrying.");
            return 1;
        }
    }
}

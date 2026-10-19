using MySql.Data.MySqlClient;
using System.Diagnostics;
using System.Net.Sockets;
using System.Security.Authentication;

namespace ExportImportApplication;

internal sealed class CliConsole(Boolean noColor) {
    private const String RunCommand = "dotnet run --project backend/ExportImportApplication --";
    private String currentStage = "Reading configuration";
    private readonly Boolean useColor = !noColor &&
        String.IsNullOrEmpty(Environment.GetEnvironmentVariable("NO_COLOR")) &&
        !String.Equals(Environment.GetEnvironmentVariable("TERM"), "dumb", StringComparison.OrdinalIgnoreCase);

    public void Heading(String text) {
        Console.WriteLine();
        WriteColored(Console.Out, text, ConsoleColor.Cyan);
        Console.WriteLine();
    }

    public void Error(String text) => WriteColored(Console.Error, $"[ERROR] {text}", ConsoleColor.Red);

    public void Warning(String text) => WriteColored(Console.Out, $"[WARNING] {text}", ConsoleColor.Yellow);

    public void Success(String text) => WriteColored(Console.Out, $"[OK] {text}", ConsoleColor.Green);

    public void Detail(String label, String value) => Console.WriteLine($"  {label,-12} {value}");

    public void Progress(String stage) {
        currentStage = stage;
        Console.WriteLine($"[RUNNING] {stage}...");
    }

    public void PrintFailure(Exception exception) {
        // Only standalone validation errors are safe to display verbatim. Provider messages can
        // contain connection strings, SQL, credentials or record values, including in inner exceptions.
        if (exception is InvalidDataException or InvalidOperationException && exception.InnerException == null) {
            Error(exception.Message);
        } else {
            Error("Operation failed. See the diagnostic codes and call stacks below.");
        }

        Console.Error.WriteLine($"  Stage: {currentStage}");
        for (Exception? current = exception; current != null; current = current.InnerException) {
            Console.Error.WriteLine($"  Exception: {current.GetType().FullName} (HResult: 0x{current.HResult:X8})");
            if (current is MySqlException mysql) {
                Console.Error.WriteLine($"  MySQL: {mysql.Number} ({Enum.GetName(typeof(MySqlErrorCode), mysql.Number) ?? "Unknown"}); SQLSTATE: {mysql.SqlState ?? "unavailable"}");
                var hint = mysql.Number switch {
                    0 or 1042 or 2002 or 2003 or 2005 => "Check DNS, the MySQL listener and the target port. With bundled Docker Compose, containers connect to mysql:3306; MYSQL_PORT is only the published host port.",
                    1044 or 1045 or 1142 or 1143 or 1227 => "Check credentials and grants for the target database. Changing .env does not update accounts in an existing MySQL volume.",
                    1049 => "The target database does not exist. Check the name and the account's CREATE privileges.",
                    1064 => "MySQL rejected the SQL syntax. Check server/provider compatibility and the failing call stack.",
                    1062 or 1451 or 1452 => "A database integrity constraint rejected the operation. Inspect the destination and archive before retrying.",
                    1205 or 1213 => "A lock timeout or deadlock occurred. Check for other database writers.",
                    1040 => "MySQL has reached its connection limit. Check server load and active connections.",
                    _ => "Use the MySQL error number and SQLSTATE to identify the server/provider failure."
                };
                Console.Error.WriteLine($"  Check: {hint}");
            } else if (current is SocketException socket) {
                Console.Error.WriteLine($"  Socket: {socket.SocketErrorCode}; native code: {socket.NativeErrorCode}");
            } else if (current is AuthenticationException) {
                Console.Error.WriteLine("  Check: TLS negotiation failed. Check server certificates, trust and TLS settings.");
            } else if (current is TimeoutException) {
                Console.Error.WriteLine("  Check: The operation timed out. Check connectivity, server load and locks.");
            }

            // StackTrace excludes exception messages; false also omits source file paths.
            Console.Error.WriteLine(new StackTrace(current, false).ToString());
        }

        Console.Error.WriteLine("  Raw provider messages and SQL values are omitted to protect credentials and financial data.");
        Console.Error.WriteLine("  Inspect the target and retain any partial output before retrying.");
    }

    public void PrintUsageHint(String? operation) {
        Console.Error.WriteLine($"Usage: {RunCommand} {CliArguments.UsageFor(operation ?? String.Empty)}");
        Console.Error.WriteLine($"Help:  {RunCommand} {(operation == null ? "--help" : $"{operation} --help")}");
    }

    public void PrintHelp(String? operation) {
        Heading("MONEYGESTOR / Database tools");
        Console.WriteLine("Initialize a database, export your data, restore an archive or delete a database.");
        Console.WriteLine("Run the examples from the repository root on Windows or Linux.");

        if (operation == null) {
            Heading("1. Choose a command");
            PrintCommand("initialize");
            PrintCommand("export");
            PrintCommand("import");
            PrintCommand("delete");
        } else {
            Heading($"Command: {operation}");
            PrintCommand(operation);
        }

        Heading("2. Understand the options");
        Console.WriteLine("  --database NAME   Exact MySQL database name, not a server or file path.");
        Console.WriteLine("                    Must match the configured connection. Required unless --configured-database is used.");
        Console.WriteLine("  --configured-database  Use database.name from the application JSON instead of --database.");
        Console.WriteLine("                         Available for initialize/export/import; never for delete.");
        if (operation == null || operation is "export" or "import") {
            Console.WriteLine("  --file PATH       Optional for export; required for import. ZIP archive path.");
            Console.WriteLine("                    Export default: ./export-yyyy-MM-dd-HHmmss.zip (UTC).");
            Console.WriteLine("                    The default directory is the current working directory.");
            Console.WriteLine("                    Export: creates a new file; existing files are never replaced.");
            Console.WriteLine("                    Import: reads an existing archive into an empty database.");
            Console.WriteLine("                    Quote paths with spaces, for example: --file \"backups/family data.zip\"");
        }

        if (operation == null || operation == "export") {
            Console.WriteLine("  --maintenance     Required for export. Confirms you have stopped ALL writers.");
            Console.WriteLine("                    This flag does not stop the application for you.");
        }

        Console.WriteLine("  --help, -h        Show help; add after a command for its specific example.");
        Console.WriteLine("  --no-color        Disable colors. Can be placed before or after the command.");

        Heading("3. Configure the connection privately");
        Console.WriteLine("  The application JSON is shared with the backend. Select it with BACKEND_APP_SETTINGS.");
        Console.WriteLine("  The default path is ./settings.json. The database section supplies the connection.");
        Console.WriteLine("  An explicit BACKEND_APP_SETTINGS path takes precedence over administrative environment settings.");
        Console.WriteLine("  For standalone administrative commands without a JSON path, the existing connection variable is supported:");
        Console.WriteLine("  Supply MONEYGESTOR_ADMIN_CONNECTION_STRING in the process environment.");
        Console.WriteLine("  It contains the MySQL server, port, user, password and Database=NAME.");
        Console.WriteLine("  PowerShell (Windows/Linux), using an already supplied private value:");
        Console.WriteLine("    $env:MONEYGESTOR_ADMIN_CONNECTION_STRING = $adminConnectionString");
        Console.WriteLine("  Bash (Linux), using an already supplied private value:");
        Console.WriteLine("    export MONEYGESTOR_ADMIN_CONNECTION_STRING=\"$adminConnectionString\"");
        Console.WriteLine("  Do not pass credentials as command-line arguments.");

        Heading("Before running");
        if (operation == null || operation is "initialize" or "import") {
            Console.WriteLine("  initialize/import create the MySQL database if it does not exist.");
            Console.WriteLine("  An existing destination must be empty. The administrative user needs CREATE privileges.");
            Console.WriteLine("  For an upgrade, import into a NEW database; keep the source for recovery.");
        }

        if (operation == null || operation is "export" or "delete") {
            Warning("Stop the application and all other writers before export or delete.");
        }

        if (operation == null || operation == "delete") {
            Warning("Delete permanently removes the entire database and requires typing its exact name.");
        }

        Console.WriteLine("  Application configuration is never changed by this tool.");
        Console.WriteLine();
        Console.WriteLine("Colors: automatic in terminals; disabled in redirected output, with NO_COLOR");
        Console.WriteLine("or TERM=dumb. Status labels remain readable without color.");
        Console.WriteLine("Exit codes: 0 = success/help; 1 = failure/cancelled; 2 = arguments/configuration.");
        Console.WriteLine($"More help: {RunCommand} {(operation == null ? "export --help" : "--help")}");
    }

    public void PrintTarget(CliArguments options, String server, UInt32 port) {
        Heading("MONEYGESTOR / Operation summary");
        Detail("Command", options.Operation!);
        Detail("Server", server);
        Detail("Port", port.ToString(System.Globalization.CultureInfo.InvariantCulture));
        Detail("Database", options.DatabaseName);
        if (options.ArchivePath != null) {
            Detail(options.Operation == "export" ? "Output ZIP" : "Input ZIP", options.ArchivePath);
        }

        Console.WriteLine();
        if (options.Operation is "initialize" or "import") {
            Console.WriteLine("The database will be created if missing; an existing destination must contain no tables.");
        } else if (options.Operation == "export") {
            Warning("Maintenance acknowledged: the application and all other writers must remain stopped.");
        }
    }

    public void PrintStarted(String operation) {
        currentStage = $"Starting {operation}";
        Console.WriteLine(operation switch {
            "initialize" => "[RUNNING] Preparing the database, creating the schema and reference data, then validating...",
            "export" => "[RUNNING] Validating the source and writing the ZIP archive...",
            "import" => "[RUNNING] Validating the archive, preparing the database and schema, then importing data...",
            _ => "[RUNNING] Deleting the confirmed database..."
        });
    }

    private void PrintCommand(String operation) {
        WriteColored(Console.Out, $"  {operation} - {operation switch {
            "initialize" => "First installation: create the database if missing, tables and reference data.",
            "export" => "Save all data from the source database to a new ZIP archive.",
            "import" => "Restore a ZIP archive into an empty destination database.",
            _ => "Permanently remove the database, including all tables and data."
        }}", operation == "delete" ? ConsoleColor.Yellow : ConsoleColor.Cyan);
        Console.WriteLine($"    Usage: {CliArguments.UsageFor(operation)}");
        var example = operation switch {
            "initialize" => "initialize --database moneygestor_new",
            "export" => "export --database moneygestor_source --maintenance",
            "import" => "import --database moneygestor_new --file family.zip",
            _ => "delete --database moneygestor_old"
        };
        Console.WriteLine($"    Example: {RunCommand} {example}");
        Console.WriteLine();
    }

    private void WriteColored(TextWriter writer, String text, ConsoleColor color) {
        var redirected = ReferenceEquals(writer, Console.Error) ? Console.IsErrorRedirected : Console.IsOutputRedirected;
        if (!useColor || redirected) {
            writer.WriteLine(text);
            return;
        }

        // ConsoleColor uses the .NET terminal implementation on both Windows and Linux.
        var original = Console.ForegroundColor;
        try {
            Console.ForegroundColor = color;
            writer.WriteLine(text);
        } finally {
            Console.ForegroundColor = original;
        }
    }
}

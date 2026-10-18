namespace ExportImportApplication;

internal sealed record CliArguments(String? Operation, String DatabaseName = "", String? ArchivePath = null, Boolean ShowHelp = false) {
    public static Boolean IsOperation(String value) => value is "initialize" or "export" or "import" or "delete";

    public static String UsageFor(String operation) => operation switch {
        "initialize" => "initialize --database NAME",
        "export" => "export --database NAME [--file ARCHIVE.zip] --maintenance",
        "import" => "import --database NAME --file ARCHIVE.zip",
        "delete" => "delete --database NAME",
        _ => "<command> [options]"
    };

    public static Boolean TryParse(String[] arguments, out CliArguments options, out String? error) {
        var args = arguments.Where(value => value != "--no-color").ToArray();
        options = new CliArguments(Operation: null);
        error = null;
        if (args.Length == 0 || (args.Length == 1 && args[0] is "--help" or "-h" or "help")) {
            options = options with { ShowHelp = true };
            return true;
        }

        if (args.Length == 2 && args[0] == "help" && IsOperation(args[1])) {
            options = options with { Operation = args[1], ShowHelp = true };
            return true;
        }

        if (!IsOperation(args[0])) {
            error = "Unknown command. Choose initialize, export, import or delete; use --help for examples.";
            return false;
        }

        options = options with { Operation = args[0] };
        if (args.Skip(1).Any(value => value is "--help" or "-h")) {
            options = options with { ShowHelp = true };
            return true;
        }

        var seen = new HashSet<String>(StringComparer.Ordinal);
        var maintenance = false;
        for (var index = 1; index < args.Length; index++) {
            var argument = args[index];
            if (argument is not ("--database" or "--file" or "--maintenance")) {
                // Do not echo arbitrary input: it could contain a misplaced credential.
                error = "Unrecognized argument. Use named options from the usage below; credentials belong in the environment variable.";
                return false;
            }

            if (!seen.Add(argument)) {
                error = $"Option {argument} was supplied more than once. Keep a single value.";
                return false;
            }

            if (argument == "--maintenance") {
                maintenance = true;
                continue;
            }

            if (index + 1 >= args.Length || String.IsNullOrWhiteSpace(args[index + 1]) || args[index + 1].StartsWith("--", StringComparison.Ordinal)) {
                error = $"Option {argument} needs a value. Use {argument} {(argument == "--database" ? "NAME" : "ARCHIVE.zip")}; quote paths containing spaces.";
                return false;
            }

            var value = args[++index];
            options = argument == "--database" ? options with { DatabaseName = value } : options with { ArchivePath = value };
        }

        if (String.IsNullOrWhiteSpace(options.DatabaseName)) {
            error = "Missing --database NAME. Specify the exact database name from the administrative connection.";
        } else if (options.Operation is "initialize" or "delete" && options.ArchivePath != null) {
            error = $"Command {options.Operation} does not accept --file. Only export and import use an archive.";
        } else if (options.Operation == "import" && options.ArchivePath == null) {
            error = "Missing --file ARCHIVE.zip. Specify the input archive path.";
        } else if (options.Operation == "export" && !maintenance) {
            error = "Export requires --maintenance. Stop the application and all other writers, then add this flag to acknowledge it.";
        } else if (options.Operation != "export" && maintenance) {
            error = $"Command {options.Operation} does not accept --maintenance. This acknowledgement is only used by export.";
        }

        return error == null;
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.Data.MySqlClient;
using System.Data;

namespace database;

public sealed class LegacyDatabaseBootstrapper(MoneyGestorContext database) {
    public const String BaselineMigrationId = "20260924185824_CreateLegacySchema";

    private static readonly String[] LegacyTables = [
        "color",
        "login",
        "transaction",
        "transaction_type",
        "user",
        "wallet"
    ];

    public async Task<DatabaseBootstrapOutcome> BootstrapAsync(
        DatabaseBootstrapMode mode,
        CancellationToken cancellationToken = default) {
        var canConnect = await database.Database.CanConnectAsync(cancellationToken);
        if (!canConnect) {
            EnsureSchemaChangesEnabled(mode,
                "The configured database does not exist or cannot be reached while database bootstrap is disabled.");
            await database.Database.MigrateAsync(cancellationToken);
            return DatabaseBootstrapOutcome.Migrated;
        }

        var appliedMigrations = (await database.Database
            .GetAppliedMigrationsAsync(cancellationToken)).ToHashSet(StringComparer.Ordinal);
        var hasBaseline = appliedMigrations.Contains(BaselineMigrationId);
        var legacyTableCount = await CountLegacyTablesAsync(database, cancellationToken);

        if (!hasBaseline && legacyTableCount > 0) {
            if (mode != DatabaseBootstrapMode.MigrateAndAdoptLegacy) {
                throw new InvalidOperationException(
                    "A legacy MoneyGestor schema without migration history was detected. " +
                    "Use MigrateAndAdoptLegacy only after a verified backup and recovery rehearsal.");
            }

            await VerifyLegacySchemaAsync(cancellationToken);
            await RecordBaselineAsync(cancellationToken);
            hasBaseline = true;
        }

        var pendingMigrations = (await database.Database
            .GetPendingMigrationsAsync(cancellationToken)).ToArray();
        if (pendingMigrations.Length == 0) {
            return hasBaseline && !appliedMigrations.Contains(BaselineMigrationId)
                ? DatabaseBootstrapOutcome.AdoptedLegacySchema
                : DatabaseBootstrapOutcome.UpToDate;
        }

        EnsureSchemaChangesEnabled(mode,
            $"{pendingMigrations.Length} database migration(s) are pending while database bootstrap is disabled.");
        await database.Database.MigrateAsync(cancellationToken);

        return hasBaseline && !appliedMigrations.Contains(BaselineMigrationId)
            ? DatabaseBootstrapOutcome.AdoptedLegacySchema
            : DatabaseBootstrapOutcome.Migrated;
    }

    private static void EnsureSchemaChangesEnabled(DatabaseBootstrapMode mode, String message) {
        if (mode == DatabaseBootstrapMode.Disabled) {
            throw new InvalidOperationException(message);
        }
    }

    private async Task VerifyLegacySchemaAsync(CancellationToken cancellationToken) {
        var targetConnectionString = database.Database.GetConnectionString();
        if (String.IsNullOrWhiteSpace(targetConnectionString)) {
            throw new InvalidOperationException("The database connection string is unavailable for baseline adoption.");
        }

        var target = new MySqlConnectionStringBuilder(targetConnectionString);
        var targetDatabase = target.Database;
        if (String.IsNullOrWhiteSpace(targetDatabase)) {
            throw new InvalidOperationException("A database name is required for baseline adoption.");
        }

        var probeDatabase = $"mg_db21_probe_{Guid.NewGuid():N}";
        var server = new MySqlConnectionStringBuilder(targetConnectionString) { Database = String.Empty };
        var probe = new MySqlConnectionStringBuilder(targetConnectionString) { Database = probeDatabase };

        await CreateDatabaseAsync(server.ConnectionString, probeDatabase, cancellationToken);
        try {
            var probeOptions = new DbContextOptionsBuilder<MoneyGestorContext>()
                .UseMySQL(probe.ConnectionString)
                .Options;
            await using (var probeContext = new MoneyGestorContext(probeOptions)) {
                var migrator = probeContext.GetService<IMigrator>();
                await migrator.MigrateAsync(BaselineMigrationId, cancellationToken);
            }

            var expected = await ReadSchemaAsync(probe.ConnectionString, probeDatabase, cancellationToken);
            var actual = await ReadSchemaAsync(targetConnectionString, targetDatabase, cancellationToken);
            var mismatches = expected.Compare(actual);
            if (mismatches.Count > 0) {
                throw new InvalidOperationException(
                    $"Legacy schema baseline adoption refused: {mismatches.Count} structural section(s) differ " +
                    $"({String.Join(", ", mismatches)}). No migration history was changed.");
            }
        } finally {
            await DropDatabaseAsync(server.ConnectionString, probeDatabase, CancellationToken.None);
        }
    }

    private async Task RecordBaselineAsync(CancellationToken cancellationToken) {
        var historyRepository = database.GetService<IHistoryRepository>();
        await database.Database.ExecuteSqlRawAsync(
            historyRepository.GetCreateIfNotExistsScript(),
            cancellationToken);

        var insertScript = historyRepository.GetInsertScript(
            new HistoryRow(BaselineMigrationId, ProductInfo.GetVersion()));
        await database.Database.ExecuteSqlRawAsync(insertScript, cancellationToken);
    }

    private static async Task<Int32> CountLegacyTablesAsync(
        MoneyGestorContext context,
        CancellationToken cancellationToken) {
        await using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = $"""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_TYPE = 'BASE TABLE'
              AND TABLE_NAME IN ({String.Join(", ", LegacyTables.Select((_, index) => $"@table{index}"))})
            """;
        for (var index = 0; index < LegacyTables.Length; index++) {
            var parameter = command.CreateParameter();
            parameter.ParameterName = $"@table{index}";
            parameter.Value = LegacyTables[index];
            command.Parameters.Add(parameter);
        }

        var connection = command.Connection!;
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) {
            await connection.OpenAsync(cancellationToken);
        }

        try {
            return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        } finally {
            if (openedHere) {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<SchemaSnapshot> ReadSchemaAsync(
        String connectionString,
        String schema,
        CancellationToken cancellationToken) {
        await using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var tables = await ReadRowsAsync(connection, schema, """
            SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = @schema
              AND TABLE_TYPE = 'BASE TABLE'
              AND TABLE_NAME IN ('color', 'login', 'transaction', 'transaction_type', 'user', 'wallet')
            ORDER BY TABLE_NAME
            """, cancellationToken);
        var columns = await ReadRowsAsync(connection, schema, """
            SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE,
                   COLUMN_DEFAULT, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema
              AND TABLE_NAME IN ('color', 'login', 'transaction', 'transaction_type', 'user', 'wallet')
            ORDER BY TABLE_NAME, ORDINAL_POSITION
            """, cancellationToken);
        var indexes = await ReadRowsAsync(connection, schema, """
            SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = @schema
              AND TABLE_NAME IN ('color', 'login', 'transaction', 'transaction_type', 'user', 'wallet')
            ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
            """, cancellationToken);
        var foreignKeys = await ReadRowsAsync(connection, schema, """
            SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.ORDINAL_POSITION,
                   k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME,
                   r.UPDATE_RULE, r.DELETE_RULE
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS k
            INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS r
                ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
               AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
               AND r.TABLE_NAME = k.TABLE_NAME
            WHERE k.CONSTRAINT_SCHEMA = @schema
              AND k.TABLE_NAME IN ('color', 'login', 'transaction', 'transaction_type', 'user', 'wallet')
              AND k.REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION
            """, cancellationToken);

        return new SchemaSnapshot(tables, columns, indexes, foreignKeys);
    }

    private static async Task<IReadOnlyList<String>> ReadRowsAsync(
        MySqlConnection connection,
        String schema,
        String sql,
        CancellationToken cancellationToken) {
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@schema", schema);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<String>();
        while (await reader.ReadAsync(cancellationToken)) {
            var fields = new String[reader.FieldCount];
            for (var index = 0; index < reader.FieldCount; index++) {
                fields[index] = reader.IsDBNull(index)
                    ? "<null>"
                    : Convert.ToString(reader.GetValue(index), System.Globalization.CultureInfo.InvariantCulture)
                        ?.ToLowerInvariant() ?? String.Empty;
            }
            rows.Add(String.Join('|', fields));
        }
        return rows;
    }

    private static async Task CreateDatabaseAsync(
        String serverConnectionString,
        String databaseName,
        CancellationToken cancellationToken) {
        await using var connection = new MySqlConnection(serverConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new MySqlCommand(
            $"CREATE DATABASE `{databaseName}` CHARACTER SET utf8mb4", connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task DropDatabaseAsync(
        String serverConnectionString,
        String databaseName,
        CancellationToken cancellationToken) {
        await using var connection = new MySqlConnection(serverConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new MySqlCommand($"DROP DATABASE IF EXISTS `{databaseName}`", connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private sealed record SchemaSnapshot(
        IReadOnlyList<String> Tables,
        IReadOnlyList<String> Columns,
        IReadOnlyList<String> Indexes,
        IReadOnlyList<String> ForeignKeys) {
        internal IReadOnlyList<String> Compare(SchemaSnapshot actual) {
            var mismatches = new List<String>();
            AddMismatch(mismatches, "tables", Tables, actual.Tables);
            AddMismatch(mismatches, "columns", Columns, actual.Columns);
            AddMismatch(mismatches, "indexes", Indexes, actual.Indexes);
            AddMismatch(mismatches, "foreign-keys", ForeignKeys, actual.ForeignKeys);
            return mismatches;
        }

        private static void AddMismatch(
            ICollection<String> mismatches,
            String section,
            IReadOnlyList<String> expected,
            IReadOnlyList<String> actual) {
            if (!expected.SequenceEqual(actual, StringComparer.Ordinal)) {
                mismatches.Add($"{section}:expected={expected.Count},actual={actual.Count}");
            }
        }
    }
}

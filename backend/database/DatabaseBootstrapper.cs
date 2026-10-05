using Microsoft.EntityFrameworkCore;
using System.Data;

namespace database;

public sealed class DatabaseBootstrapper(MoneyGestorContext database) {
    public const String InitialMigrationId = "20261001180542_InitialMoneyGestorSchema";

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
        if (!appliedMigrations.Contains(InitialMigrationId) &&
            (appliedMigrations.Count > 0 || await HasExistingTablesAsync(cancellationToken))) {
            throw new InvalidOperationException(
                "The configured database contains an existing schema without the current initial migration. " +
                "Use an empty database for the new MoneyGestor schema; existing data is never deleted at startup.");
        }

        var pendingMigrations = (await database.Database
            .GetPendingMigrationsAsync(cancellationToken)).ToArray();
        if (pendingMigrations.Length == 0) {
            return DatabaseBootstrapOutcome.UpToDate;
        }

        EnsureSchemaChangesEnabled(mode,
            pendingMigrations.Length + " database migration(s) are pending while database bootstrap is disabled.");
        await database.Database.MigrateAsync(cancellationToken);
        return DatabaseBootstrapOutcome.Migrated;
    }

    private static void EnsureSchemaChangesEnabled(DatabaseBootstrapMode mode, String message) {
        if (mode == DatabaseBootstrapMode.Disabled) {
            throw new InvalidOperationException(message);
        }
    }

    private async Task<Boolean> HasExistingTablesAsync(CancellationToken cancellationToken) {
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_TYPE = 'BASE TABLE'
              AND TABLE_NAME <> '__EFMigrationsHistory'
            """;

        var connection = command.Connection!;
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) {
            await connection.OpenAsync(cancellationToken);
        }

        try {
            return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
        } finally {
            if (openedHere) {
                await connection.CloseAsync();
            }
        }
    }
}

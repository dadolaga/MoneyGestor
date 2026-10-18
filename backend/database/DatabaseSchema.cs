using database.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;

namespace database;

public static class DatabaseSchema {
    public const Int32 CurrentVersion = 1;

    public static async Task RequireCurrentAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        if (!await database.Database.CanConnectAsync(cancellationToken)) {
            throw new InvalidOperationException("The database is missing or unreachable. Verify the target and run manual initialization if necessary.");
        }

        var hasMetadata = await CountObjectsAsync(database, "AND TABLE_NAME = 'database_metadata'", cancellationToken) == 1;
        var versions = hasMetadata
            ? await database.Metadata.AsNoTracking().ToArrayAsync(cancellationToken)
            : [];
        if (versions.Length != 1 || versions[0].Id != 1) {
            throw new InvalidOperationException("Database version is missing or incomplete. Manual initialization or import is required; existing data was not modified.");
        }

        var version = versions[0].SchemaVersion;
        if (version != CurrentVersion) {
            throw new InvalidOperationException(
                $"Database schema version {version} is incompatible; this release requires {CurrentVersion}. " +
                "Stop the application and manually export/import into a new database using compatible tools. No automatic update was performed.");
        }
    }

    public static async Task CreateEmptyAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        // Only the explicit administrative initialize/import workflow calls this method.
        var creator = database.GetService<IRelationalDatabaseCreator>();
        if (!await creator.ExistsAsync(cancellationToken)) {
            await creator.CreateAsync(cancellationToken);
        }

        await database.Database.OpenConnectionAsync(cancellationToken);
        if (await CountObjectsAsync(database, String.Empty, cancellationToken) != 0) {
            throw new InvalidOperationException("The destination must be missing or empty. No tables were replaced or deleted.");
        }

        if (!await database.Database.EnsureCreatedAsync(cancellationToken)) {
            throw new InvalidOperationException("The destination schema could not be initialized as an empty database.");
        }
    }

    public static async Task MarkReadyAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        database.Metadata.Add(new DatabaseMetadata { SchemaVersion = CurrentVersion });
        await database.SaveChangesAsync(cancellationToken);
    }

    private static async Task<Int32> CountObjectsAsync(
        MoneyGestorContext database, String filter, CancellationToken cancellationToken) {
        var connection = database.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) {
            await connection.OpenAsync(cancellationToken);
        }

        try {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() " + filter;
            return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        } finally {
            if (openedHere) {
                await connection.CloseAsync();
            }
        }
    }
}

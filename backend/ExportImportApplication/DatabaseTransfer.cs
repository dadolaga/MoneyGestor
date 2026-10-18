using database;
using database.Models;
using logic;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ExportImportApplication;

public static class DatabaseTransfer {
    public static async Task DeleteAsync(
        MoneyGestorContext database, String confirmedDatabaseName, CancellationToken cancellationToken = default) {
        var name = database.Database.GetDbConnection().Database;
        if (String.IsNullOrWhiteSpace(name) || !String.Equals(name, confirmedDatabaseName, StringComparison.Ordinal)) {
            throw new InvalidOperationException("Deletion requires confirmation of the exact configured database name.");
        }
        if (new[] { "mysql", "sys", "information_schema", "performance_schema" }.Contains(name, StringComparer.OrdinalIgnoreCase)) {
            throw new InvalidOperationException("System databases cannot be deleted by this tool.");
        }

        // Deletion is deliberately independent of schema version, including incomplete imports.
        if (!await database.Database.EnsureDeletedAsync(cancellationToken)) {
            throw new InvalidOperationException("The database was not deleted. Verify that it exists and that the administrative account can access it.");
        }
    }

    public static async Task InitializeAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        await DatabaseSchema.CreateEmptyAsync(database, cancellationToken);
        await new DatabaseInitializer(database).InitAsync(cancellationToken);
        await ValidateAsync(database, cancellationToken);
        await DatabaseSchema.MarkReadyAsync(database, cancellationToken);
    }

    public static async Task ExportAsync(
        MoneyGestorContext database, String archivePath, TimeProvider timeProvider, CancellationToken cancellationToken = default) {
        await DatabaseSchema.RequireCurrentAsync(database, cancellationToken);
        ArchiveValidation.RequireCompleteContract(database);
        await using var transaction = await database.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken);
        await ValidateAsync(database, cancellationToken);
        var snapshot = new ArchiveSnapshot();
        foreach (var table in ArchiveTable.All) {
            snapshot.Rows.Add(table.EntityType, await table.LoadAsync(database, cancellationToken));
        }
        ArchiveValidation.RequireValid(database, snapshot);
        cancellationToken.ThrowIfCancellationRequested();
        ArchiveFile.Write(archivePath, snapshot, timeProvider);
        await transaction.CommitAsync(cancellationToken);
    }

    public static async Task ImportAsync(MoneyGestorContext database, String archivePath, CancellationToken cancellationToken = default) {
        // Fully parse and validate the archive before creating any destination objects.
        var snapshot = ArchiveFile.Read(archivePath);
        ArchiveValidation.RequireValid(database, snapshot);
        await DatabaseSchema.CreateEmptyAsync(database, cancellationToken);
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);

        // Self-references are restored after inserting their principals; all writes share this transaction.
        var parents = snapshot.Get<TransactionTypeDb>().Select(row => (Row: row, Parent: row.ParentId)).ToArray();
        var links = snapshot.Get<WalletDb>().Select(row => (Row: row, Link: row.LinkedAccountId)).ToArray();
        var pairs = snapshot.Get<TransactionDb>().Select(row => (Row: row, Pair: row.TransactionDestinationId)).ToArray();
        foreach (var item in parents) { item.Row.ParentId = null; }
        foreach (var item in links) { item.Row.LinkedAccountId = null; }
        foreach (var item in pairs) { item.Row.TransactionDestinationId = null; }

        foreach (var table in ArchiveTable.All) {
            database.AddRange(snapshot.Rows[table.EntityType]);
            await database.SaveChangesAsync(cancellationToken);
        }
        foreach (var item in parents) { item.Row.ParentId = item.Parent; }
        foreach (var item in links) { item.Row.LinkedAccountId = item.Link; }
        foreach (var item in pairs) { item.Row.TransactionDestinationId = item.Pair; }
        await database.SaveChangesAsync(cancellationToken);

        await ValidateAsync(database, cancellationToken);
        // Explicit positive IDs advance MySQL AUTO_INCREMENT. Read back every scalar to detect defaults or coercion.
        foreach (var table in ArchiveTable.All) {
            var actual = await table.LoadAsync(database, cancellationToken);
            var expected = snapshot.Rows[table.EntityType];
            var expectedValues = expected.Select(row => RowSignature(table, row)).Order(StringComparer.Ordinal);
            if (!expectedValues.SequenceEqual(actual.Select(row => RowSignature(table, row)).Order(StringComparer.Ordinal))) {
                throw new InvalidDataException("Imported records differ from the validated archive. The destination was not marked ready.");
            }
        }
        await DatabaseSchema.MarkReadyAsync(database, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private static String RowSignature(ArchiveTable table, Object row) =>
        System.Text.Json.JsonSerializer.Serialize(table.Properties.Select(property => CsvCodec.Format(property.GetValue(row))).ToArray());

    private static async Task ValidateAsync(MoneyGestorContext database, CancellationToken cancellationToken) {
        await new DatabaseInitializer(database).ValidateAsync(cancellationToken);
        await DataIntegrityPreflight.EnsureValidAsync(database, cancellationToken);
    }
}

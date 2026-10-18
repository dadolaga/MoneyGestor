using database;
using database.Models;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using System.Text.Json;

namespace ExportImportApplication;

internal static class ArchiveValidation {
    internal static void RequireCompleteContract(MoneyGestorContext database) {
        var entities = database.Model.GetEntityTypes().Where(entity => entity.ClrType != typeof(DatabaseMetadata)).ToArray();
        if (entities.Length != ArchiveTable.All.Length || entities.Any(entity =>
            !ArchiveTable.All.Any(table => table.EntityType == entity.ClrType &&
                table.Properties.Select(property => property.Name).Order().SequenceEqual(entity.GetProperties().Select(property => property.Name).Order())))) {
            throw new InvalidOperationException("The database model changed without updating the versioned archive contract.");
        }
    }

    internal static void RequireValid(MoneyGestorContext database, ArchiveSnapshot snapshot) {
        RequireCompleteContract(database);
        var keys = new Dictionary<Type, HashSet<String>>();
        foreach (var table in ArchiveTable.All) {
            var entity = database.Model.FindEntityType(table.EntityType)!;
            var primaryKey = entity.FindPrimaryKey()!;
            var values = new HashSet<String>(StringComparer.Ordinal);
            foreach (var row in snapshot.Rows[table.EntityType]) {
                foreach (var property in entity.GetProperties()) {
                    var value = property.PropertyInfo!.GetValue(row);
                    if ((!property.IsNullable && value == null) ||
                        (value is String text && property.GetMaxLength() is Int32 maximum && text.Length > maximum)) {
                        throw new InvalidDataException("Archive data violates a required field or column length.");
                    }
                    if (value is Decimal money) { MonetaryValuePolicy.RequireValid(money); }
                    if (value is DateOnly date) { BusinessDatePolicy.RequireValid(date); }
                }
                if (primaryKey.Properties.Any(property => property.PropertyInfo!.GetValue(row) is null or 0UL or 0)) {
                    throw new InvalidDataException("An archive contains an empty primary key.");
                }
                if (!values.Add(Key(primaryKey.Properties, row))) {
                    throw new InvalidDataException("An archive contains duplicate primary keys.");
                }
            }
            keys.Add(table.EntityType, values);
        }

        foreach (var table in ArchiveTable.All) {
            var entity = database.Model.FindEntityType(table.EntityType)!;
            foreach (var row in snapshot.Rows[table.EntityType]) {
                foreach (var foreignKey in entity.GetForeignKeys()) {
                    if (foreignKey.Properties.Any(property => property.PropertyInfo!.GetValue(row) == null)) { continue; }
                    if (!keys[foreignKey.PrincipalEntityType.ClrType].Contains(Key(foreignKey.Properties, row))) {
                        throw new InvalidDataException("An archive contains a reference to a missing record.");
                    }
                }
            }
        }

        var types = snapshot.Get<TransactionTypeDb>().ToDictionary(type => type.Id);
        foreach (var type in types.Values) {
            var visited = new HashSet<UInt64> { type.Id };
            var parentId = type.ParentId;
            while (parentId != null) {
                var parent = types[parentId.Value];
                if (!visited.Add(parent.Id) || parent.Id is 1 or 2 ||
                    (parent.UserId != null && parent.UserId != type.UserId)) {
                    throw new InvalidDataException("An archive contains an invalid category hierarchy.");
                }
                parentId = parent.ParentId;
            }
        }

        var transactions = snapshot.Get<TransactionDb>().ToDictionary(row => row.Id);
        foreach (var row in transactions.Values) {
            MonetaryValuePolicy.RequireValid(row.Value, allowZero: false);
            if (row.TransactionTypeId != 1) { continue; }
            if (row.TransactionDestinationId == null ||
                transactions[row.TransactionDestinationId.Value].Date != row.Date) {
                throw new InvalidDataException("An archive contains an incomplete transfer or mismatched transfer dates.");
            }
        }
    }

    private static String Key(IReadOnlyList<IProperty> properties, Object row) =>
        JsonSerializer.Serialize(properties.Select(property => property.PropertyInfo!.GetValue(row)).ToArray());
}

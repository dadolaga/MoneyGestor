using database;
using database.Models;
using logic.Exceptions;
using logic.Models;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

internal static class TransactionTypeConfigurationPolicy {
    internal static void Validate(String name, TransactionTypeDetails details) {
        if (String.IsNullOrWhiteSpace(name) || name.Trim().Length > 100) {
            throw new ResourceValidationException("name", "invalid_name");
        }
        if (!new[] { "shopping", "home", "transport", "food", "utilities", "work", "entertainment", "health", "tag" }.Contains(details.Icon)) {
            throw new ResourceValidationException("icon", "invalid_icon");
        }
        if (!new[] { "red", "orange", "yellow", "green", "cyan", "blue", "purple", "grey" }.Contains(details.Color)) {
            throw new ResourceValidationException("color", "invalid_color");
        }
        if (details.Description?.Length > 500 || details.Keywords?.Length > 1000) {
            throw new ResourceValidationException(details.Description?.Length > 500 ? "description" : "keywords", "too_long");
        }
    }

    internal static async Task LockOwnerAsync(MoneyGestorContext database, UInt64 ownerId, CancellationToken cancellationToken) {
        // Serialize hierarchy writes before any snapshot reads: simultaneous reparenting must not create a cycle.
        var owners = await database.Database.SqlQuery<UInt64>($"""
            SELECT `Id` AS `Value` FROM `AspNetUsers` WHERE `Id` = {ownerId} FOR UPDATE
            """).ToListAsync(cancellationToken);
        if (owners.Count == 0) {
            throw new ObjectNotFoundException("User not found");
        }
    }

    internal static async Task ValidateParentAsync(MoneyGestorContext database, UInt64 ownerId,
        UInt64? parentId, UInt64? categoryId, CancellationToken cancellationToken) {
        var ancestors = new HashSet<UInt64>();
        if (categoryId.HasValue) ancestors.Add(categoryId.Value);
        while (parentId.HasValue) {
            if (!ancestors.Add(parentId.Value) || parentId == DatabaseInitializer.TRANSFER.Id || parentId == DatabaseInitializer.ADJUSTMENT.Id) {
                throw new ResourceValidationException("parentId", "invalid_parent");
            }
            var parent = await OwnershipPolicy.RequireAvailableTransactionTypeAsync(database, parentId.Value, ownerId, cancellationToken);
            parentId = parent.ParentId;
        }
    }

    internal static void Apply(TransactionTypeDb category, String name, TransactionTypeDetails details) {
        category.Name = name.Trim();
        category.ParentId = details.ParentId;
        category.Icon = details.Icon;
        category.Color = details.Color;
        category.Description = String.IsNullOrWhiteSpace(details.Description) ? null : details.Description.Trim();
        category.Keywords = String.IsNullOrWhiteSpace(details.Keywords) ? null : details.Keywords.Trim();
        category.UseInReports = details.UseInReports;
    }
}

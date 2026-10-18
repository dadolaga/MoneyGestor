using database.Models;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class AddTransactionTypeCommand(String name, logic.Models.TransactionTypeDetails? details = null) : ICommand<UInt64> {
        public String name = name.Trim();
        private readonly logic.Models.TransactionTypeDetails details = details ?? new();

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;

            if (String.IsNullOrWhiteSpace(name) || name.Length > 100) {
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

            var ancestors = new HashSet<UInt64>();
            var parentId = details.ParentId;
            while (parentId.HasValue) {
                if (!ancestors.Add(parentId.Value) || parentId == DatabaseInitializer.TRANSFER.Id || parentId == DatabaseInitializer.ADJUSTMENT.Id) {
                    throw new ResourceValidationException("parentId", "invalid_parent");
                }

                var parent = await OwnershipPolicy.RequireAvailableTransactionTypeAsync(database, parentId.Value, executorManager.UserId, cancellationToken);
                parentId = parent.ParentId;
            }

            if (await database.TransactionTypes.AnyAsync(tt => tt.UserId == executorManager.UserId && tt.Name == name, cancellationToken)) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            var transactionType = new TransactionTypeDb {
                Name = name,
                UserId = executorManager.UserId,
                ParentId = details.ParentId,
                Icon = details.Icon,
                Color = details.Color,
                Description = String.IsNullOrWhiteSpace(details.Description) ? null : details.Description.Trim(),
                Keywords = String.IsNullOrWhiteSpace(details.Keywords) ? null : details.Keywords.Trim(),
                UseInReports = details.UseInReports,
            };

            await database.TransactionTypes.AddAsync(transactionType, cancellationToken);

            try {
                await database.SaveChangesAsync(cancellationToken);
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            return transactionType.Id;
        }
    }
}
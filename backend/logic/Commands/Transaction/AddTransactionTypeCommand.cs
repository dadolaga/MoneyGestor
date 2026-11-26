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

            TransactionTypeConfigurationPolicy.Validate(name, details);
            await TransactionTypeConfigurationPolicy.LockOwnerAsync(database, executorManager.UserId, cancellationToken);
            await TransactionTypeConfigurationPolicy.ValidateParentAsync(database, executorManager.UserId, details.ParentId, null, cancellationToken);

            if (await database.TransactionTypes.AnyAsync(tt => tt.UserId == executorManager.UserId && tt.Name == name, cancellationToken)) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            var transactionType = new TransactionTypeDb {
                UserId = executorManager.UserId,
            };
            TransactionTypeConfigurationPolicy.Apply(transactionType, name, details);

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

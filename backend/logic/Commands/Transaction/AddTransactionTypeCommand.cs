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
    public class AddTransactionTypeCommand : ICommand<UInt64> {
        public String name;

        public AddTransactionTypeCommand(String name) {
            this.name = name;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;

            if(await database.TransactionTypes.AnyAsync(tt => tt.UserId == executorManager.UserId && tt.Name == name, cancellationToken)) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            var transactionType = new TransactionTypeDb {
                Name = name,
                UserId = executorManager.UserId,
            };

            await database.TransactionTypes.AddAsync(transactionType, cancellationToken);

            try {
                await database.SaveChangesAsync(cancellationToken);
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            result = transactionType.Id;
        }
    }
}

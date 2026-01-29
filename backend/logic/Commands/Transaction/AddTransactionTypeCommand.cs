using database.Models;
using logic.Exceptions;
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

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            if(database.TransactionTypes.FirstOrDefault(tt => tt.UserId == executorManager.UserId && tt.Name == name) != null) {
                throw new DuplicateObjectException("This transaction type already exist");
            }

            var transactionType = new TransactionTypeDb {
                Name = name,
                UserId = executorManager.UserId,
            };

            await database.TransactionTypes.AddAsync(transactionType);

            await database.SaveChangesAsync();

            result = transactionType.Id;
        }
    }
}

using logic.Commands.Wallets;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class DeleteTransactionCommand : ICommand<UInt64> {
        private UInt64 id;

        public DeleteTransactionCommand(UInt64 id) {
            this.id = id;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var transaction = (await database.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserInsertId == executorManager.UserId)) ?? throw new UserNotHavePermissionExcpetion();

            if (transaction.TransactionDestinationId != null) {
                var transactionDestination = await database.Transactions.FirstAsync(t => t.Id == transaction.TransactionDestinationId);

                var updateDestinationWalletValueCommnad = new UpdateWalletCurrentValueCommand(transactionDestination.WalletId, -transactionDestination.Value, true);

                await updateDestinationWalletValueCommnad.Execute(executorManager);

                database.Transactions.Remove(transactionDestination);
                await database.SaveChangesAsync();
            }

            var updateWalletValueCommnad = new UpdateWalletCurrentValueCommand(transaction.WalletId, -transaction.Value, true);

            await updateWalletValueCommnad.Execute(executorManager);
            
            database.Transactions.Remove(transaction);

            await database.SaveChangesAsync();
        }
    }
}

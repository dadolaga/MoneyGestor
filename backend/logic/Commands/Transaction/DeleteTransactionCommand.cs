using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class DeleteTransactionCommand : ICommand<UInt64> {
        private UInt64 id;

        public DeleteTransactionCommand(UInt64 id) {
            this.id = id;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var requestedTransaction = await database.Transactions
                .Include(transaction => transaction.TransactionDestination)
                .FirstOrDefaultAsync(transaction =>
                    transaction.Id == id && transaction.UserId == executorManager.UserId)
                ?? throw new ObjectNotFoundException("Transaction not found");

            var sourceTransaction = requestedTransaction;
            global::database.Models.TransactionDb? destinationTransaction = null;
            if (requestedTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
                || requestedTransaction.TransactionDestinationId != null) {
                (sourceTransaction, destinationTransaction) =
                    TransactionPairPolicy.RequireValidTransferPair(requestedTransaction);
            }

            var sourceWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                sourceTransaction.WalletId,
                executorManager.UserId);
            sourceWallet.CurrentValue -= sourceTransaction.Value;

            if (destinationTransaction != null) {
                var destinationWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    destinationTransaction.WalletId,
                    executorManager.UserId);
                destinationWallet.CurrentValue -= destinationTransaction.Value;

                sourceTransaction.TransactionDestinationId = null;
                destinationTransaction.TransactionDestinationId = null;
                await database.SaveChangesAsync();

                database.Transactions.Remove(destinationTransaction);
            }

            database.Transactions.Remove(sourceTransaction);

            await database.SaveChangesAsync();

            result = sourceTransaction.Id;
        }
    }
}

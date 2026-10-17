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

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;

            var requestedTransaction = await TransactionPairPolicy.LockOwnedTransactionAsync(
                database,
                id,
                executorManager.UserId, cancellationToken);

            var sourceTransaction = requestedTransaction;
            global::database.Models.TransactionDb? destinationTransaction = null;
            if (requestedTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
                || requestedTransaction.TransactionDestinationId != null) {
                (sourceTransaction, destinationTransaction) =
                    TransactionPairPolicy.RequireValidTransferPair(requestedTransaction);
            }

            await OwnershipPolicy.LockOwnedWalletsAsync(
                database, executorManager.UserId, cancellationToken,
                destinationTransaction == null
                    ? [sourceTransaction.WalletId]
                    : [sourceTransaction.WalletId, destinationTransaction.WalletId]);

            var sourceWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                sourceTransaction.WalletId,
                executorManager.UserId, cancellationToken);
            WalletBalancePolicy.Apply(sourceWallet, -sourceTransaction.Value);

            if (destinationTransaction != null) {
                var destinationWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    destinationTransaction.WalletId,
                    executorManager.UserId, cancellationToken);
                WalletBalancePolicy.Apply(destinationWallet, -destinationTransaction.Value);

                sourceTransaction.TransactionDestinationId = null;
                destinationTransaction.TransactionDestinationId = null;
                await database.SaveChangesAsync(cancellationToken);

                database.Transactions.Remove(destinationTransaction);
            }

            database.Transactions.Remove(sourceTransaction);

            await database.SaveChangesAsync(cancellationToken);

            return sourceTransaction.Id;
        }
    }
}
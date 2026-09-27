using database.Models;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class UpdateTransactionCommand : ICommand<UInt64> {
        private UInt64 id;
        private String? description;
        private String? longDescription;
        private DateOnly? date;
        private UInt64? walletId;
        private UInt64? walletDestinationId;
        private Decimal? value;
        private UInt64? transactionTypeId;
        private UInt64? userId;
        private Boolean overwriteNull;

        public UpdateTransactionCommand(UInt64 id,
                String? description = null,
                String? longDescription = null,
                DateOnly? date = null,
                UInt64? walletId = null,
                UInt64? walletDestinationId = null,
                Decimal? value = null,
                UInt64? transactionTypeId = null,
                UInt64? userId = null,
                Boolean overwriteNull = false) {
            this.id = id;
            this.description = description;
            this.longDescription = longDescription;
            this.date = date;
            this.walletId = walletId;
            this.walletDestinationId = walletDestinationId;
            this.value = value;
            this.transactionTypeId = transactionTypeId;
            this.userId = userId;
            this.overwriteNull = overwriteNull;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;
            var ownerId = executorManager.UserId;

            var requestedTransaction = await TransactionPairPolicy.LockOwnedTransactionAsync(
                database,
                id,
                ownerId);

            if (userId != null && userId != ownerId) {
                throw new UserNotHavePermissionExcpetion("Transaction owner cannot be supplied by the client");
            }

            TransactionDb sourceTransaction = requestedTransaction;
            TransactionDb? destinationTransaction = null;
            if (requestedTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
                || requestedTransaction.TransactionDestinationId != null) {
                (sourceTransaction, destinationTransaction) =
                    TransactionPairPolicy.RequireValidTransferPair(requestedTransaction);
            }

            var finalTypeId = transactionTypeId ?? sourceTransaction.TransactionTypeId;
            var finalType = await OwnershipPolicy.RequireAvailableTransactionTypeAsync(database, finalTypeId, ownerId);
            var finalIsTransfer = finalType.Id == DatabaseInitializer.TRANSFER.Id;
            var finalSourceWalletId = walletId ?? sourceTransaction.WalletId;
            var finalSourceWallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, finalSourceWalletId, ownerId);
            WalletDb? finalDestinationWallet = null;
            Decimal finalValue;

            if (finalIsTransfer) {
                var finalDestinationWalletId = walletDestinationId
                    ?? (!overwriteNull ? destinationTransaction?.WalletId : null);
                finalValue = value ?? Math.Abs(sourceTransaction.Value);

                MonetaryValuePolicy.RequireValid(finalValue, allowZero: false);
                if (finalDestinationWalletId == null || finalValue <= 0) {
                    throw new InvalidTransactionException("Transfers require a destination wallet and a positive value");
                }

                if (finalDestinationWalletId.Value == finalSourceWallet.Id) {
                    throw new InvalidTransactionException("Transfer wallets must be different");
                }

                finalDestinationWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    finalDestinationWalletId.Value,
                    ownerId);
            } else {
                if (walletDestinationId != null) {
                    throw new InvalidTransactionException("Only transfers can specify a destination wallet");
                }

                finalValue = value ?? (destinationTransaction == null
                    ? sourceTransaction.Value
                    : Math.Abs(sourceTransaction.Value));
                MonetaryValuePolicy.RequireValid(finalValue, allowZero: false);
            }

            var oldSourceWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                sourceTransaction.WalletId,
                ownerId);
            WalletDb? oldDestinationWallet = null;
            if (destinationTransaction != null) {
                oldDestinationWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    destinationTransaction.WalletId,
                    ownerId);
            }

            await OwnershipPolicy.LockOwnedWalletsAsync(
                database,
                ownerId,
                new[] {
                    sourceTransaction.WalletId,
                    destinationTransaction?.WalletId,
                    finalSourceWallet.Id,
                    finalDestinationWallet?.Id
                }.Where(wallet => wallet.HasValue).Select(wallet => wallet!.Value).ToArray());

            var finalDescription = overwriteNull ? description : description ?? sourceTransaction.Description;
            var finalLongDescription = overwriteNull
                ? longDescription
                : longDescription ?? sourceTransaction.LongDescription;
            var finalDate = date ?? sourceTransaction.Date;

            try {
                WalletBalancePolicy.Apply(oldSourceWallet, -sourceTransaction.Value);
                if (destinationTransaction != null && oldDestinationWallet != null) {
                    WalletBalancePolicy.Apply(oldDestinationWallet, -destinationTransaction.Value);
                }

                sourceTransaction.Description = finalDescription;
                sourceTransaction.LongDescription = finalLongDescription;
                sourceTransaction.Date = finalDate;
                sourceTransaction.WalletId = finalSourceWallet.Id;
                sourceTransaction.TransactionTypeId = finalTypeId;
                sourceTransaction.UserId = ownerId;
                sourceTransaction.UserInsertId = ownerId;

                if (!finalIsTransfer) {
                    sourceTransaction.Value = finalValue;
                    sourceTransaction.TransactionDestinationId = null;
                    WalletBalancePolicy.Apply(finalSourceWallet, finalValue);

                    if (destinationTransaction != null) {
                        destinationTransaction.TransactionDestinationId = null;
                        database.Transactions.Remove(destinationTransaction);
                    }

                    await database.SaveChangesAsync();
                } else {
                    sourceTransaction.Value = -finalValue;
                    WalletBalancePolicy.Apply(finalSourceWallet, -finalValue);
                    WalletBalancePolicy.Apply(finalDestinationWallet!, finalValue);

                    if (destinationTransaction == null) {
                        destinationTransaction = new TransactionDb {
                            TransactionDestinationId = sourceTransaction.Id
                        };
                        database.Transactions.Add(destinationTransaction);
                    }

                    destinationTransaction.Description = finalDescription;
                    destinationTransaction.LongDescription = finalLongDescription;
                    destinationTransaction.Date = finalDate;
                    destinationTransaction.WalletId = finalDestinationWallet.Id;
                    destinationTransaction.TransactionTypeId = DatabaseInitializer.TRANSFER.Id;
                    destinationTransaction.UserId = ownerId;
                    destinationTransaction.UserInsertId = ownerId;
                    destinationTransaction.Value = finalValue;

                    await database.SaveChangesAsync();

                    sourceTransaction.TransactionDestinationId = destinationTransaction.Id;
                    destinationTransaction.TransactionDestinationId = sourceTransaction.Id;
                    await database.SaveChangesAsync();
                }

                result = sourceTransaction.Id;
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsRetryable(exception)) {
                throw;
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Transaction reference not found");
            }
        }
    }
}

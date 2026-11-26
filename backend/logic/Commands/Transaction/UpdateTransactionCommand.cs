using database.Models;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class UpdateTransactionCommand(UInt64 id,
            String? description = null,
            String? longDescription = null,
            DateOnly? date = null,
            UInt64? walletId = null,
            UInt64? walletDestinationId = null,
            Decimal? value = null,
            UInt64? transactionTypeId = null,
            Boolean overwriteDescription = false,
            Boolean overwriteLongDescription = false) : ICommand<UInt64> {
        private readonly UInt64 id = id;
        private readonly String? description = description;
        private readonly String? longDescription = longDescription;
        private readonly DateOnly? date = date;
        private readonly UInt64? walletId = walletId;
        private readonly UInt64? walletDestinationId = walletDestinationId;
        private readonly Decimal? value = value;
        private readonly UInt64? transactionTypeId = transactionTypeId;
        private readonly Boolean overwriteDescription = overwriteDescription;
        private readonly Boolean overwriteLongDescription = overwriteLongDescription;

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            var ownerId = executorManager.UserId;

            var requestedTransaction = await TransactionPairPolicy.LockOwnedTransactionAsync(
                database,
                id,
                ownerId, cancellationToken);

            TransactionDb sourceTransaction = requestedTransaction;
            TransactionDb? destinationTransaction = null;
            if (requestedTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
                || requestedTransaction.TransactionDestinationId != null) {
                (sourceTransaction, destinationTransaction) =
                    TransactionPairPolicy.RequireValidTransferPair(requestedTransaction);
            }

            var finalTypeId = transactionTypeId ?? sourceTransaction.TransactionTypeId;
            var finalType = await OwnershipPolicy.RequireAvailableTransactionTypeAsync(database, finalTypeId, ownerId, cancellationToken);
            var finalIsTransfer = finalType.Id == DatabaseInitializer.TRANSFER.Id;
            var finalSourceWalletId = walletId ?? sourceTransaction.WalletId;
            var finalSourceWallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, finalSourceWalletId, ownerId, cancellationToken);
            WalletDb? finalDestinationWallet = null;
            Decimal finalValue;

            if (finalIsTransfer) {
                var finalDestinationWalletId = walletDestinationId
                    ?? destinationTransaction?.WalletId;
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
                    ownerId, cancellationToken);
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
                ownerId, cancellationToken);
            WalletDb? oldDestinationWallet = null;
            if (destinationTransaction != null) {
                oldDestinationWallet = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    destinationTransaction.WalletId,
                    ownerId, cancellationToken);
            }

            await OwnershipPolicy.LockOwnedWalletsAsync(
                database, ownerId, cancellationToken,
                [.. new[] {
                    sourceTransaction.WalletId,
                    destinationTransaction?.WalletId,
                    finalSourceWallet.Id,
                    finalDestinationWallet?.Id
                }.Where(wallet => wallet.HasValue).Select(wallet => wallet!.Value)]);

            var finalDescription = overwriteDescription ? description : description ?? sourceTransaction.Description;
            var finalLongDescription = overwriteLongDescription
                ? longDescription
                : longDescription ?? sourceTransaction.LongDescription;
            var finalDate = date ?? sourceTransaction.Date;
            BusinessDatePolicy.RequireValid(finalDate);

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

                    await database.SaveChangesAsync(cancellationToken);
                } else {
                    var destinationWallet = finalDestinationWallet
                        ?? throw new InvalidOperationException("Transfer destination wallet was not resolved");
                    sourceTransaction.Value = -finalValue;
                    WalletBalancePolicy.Apply(finalSourceWallet, -finalValue);
                    WalletBalancePolicy.Apply(destinationWallet, finalValue);

                    if (destinationTransaction == null) {
                        destinationTransaction = new TransactionDb {
                            TransactionDestinationId = sourceTransaction.Id
                        };
                        database.Transactions.Add(destinationTransaction);
                    }

                    destinationTransaction.Description = finalDescription;
                    destinationTransaction.LongDescription = finalLongDescription;
                    destinationTransaction.Date = finalDate;
                    destinationTransaction.WalletId = destinationWallet.Id;
                    destinationTransaction.TransactionTypeId = DatabaseInitializer.TRANSFER.Id;
                    destinationTransaction.UserId = ownerId;
                    destinationTransaction.UserInsertId = ownerId;
                    destinationTransaction.Value = finalValue;

                    await database.SaveChangesAsync(cancellationToken);

                    sourceTransaction.TransactionDestinationId = destinationTransaction.Id;
                    destinationTransaction.TransactionDestinationId = sourceTransaction.Id;
                    await database.SaveChangesAsync(cancellationToken);
                }

                return sourceTransaction.Id;
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsRetryable(exception)) {
                throw;
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Transaction reference not found");
            }
        }
    }
}
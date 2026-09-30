using database.Models;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class AddTransactionCommand : ICommand<UInt64> {
        private String? description;
        private String? longDescription;
        private DateOnly date;
        private UInt64 walletId;
        private UInt64? walletDestinationId;
        private Decimal value;
        private UInt64 transactionTypeId;
        private UInt64? userId;

        public AddTransactionCommand(String? description, String? longDescription, DateOnly date, UInt64 walletId, Decimal value, UInt64 transactionTypeId, UInt64? userId, UInt64? walletDestinationId = null) {
            this.description = description;
            this.longDescription = longDescription;
            this.date = date;
            this.walletId = walletId;
            this.walletDestinationId = walletDestinationId;
            this.value = value;
            this.transactionTypeId = transactionTypeId;
            this.userId = userId;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            var ownerId = executorManager.UserId;

            if (userId != null && userId != ownerId) {
                throw new UserPermissionException("Transaction owner cannot be supplied by the client");
            }

            MonetaryValuePolicy.RequireValid(value, allowZero: false);
            BusinessDatePolicy.RequireValid(date);

            var transactionType = await OwnershipPolicy.RequireAvailableTransactionTypeAsync(
                database,
                transactionTypeId,
                ownerId, cancellationToken);
            var wallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, walletId, ownerId, cancellationToken);
            var isTransfer = transactionType.Id == DatabaseInitializer.TRANSFER.Id;
            WalletDb? walletDestination = null;

            if (isTransfer) {
                if (walletDestinationId == null || value <= 0) {
                    throw new InvalidTransactionException("Transfers require a destination wallet and a positive value");
                }

                if (walletDestinationId.Value == wallet.Id) {
                    throw new InvalidTransactionException("Transfer wallets must be different");
                }

                walletDestination = await OwnershipPolicy.RequireOwnedWalletAsync(
                    database,
                    walletDestinationId.Value,
                    ownerId, cancellationToken);
            } else if (walletDestinationId != null) {
                throw new InvalidTransactionException("Only transfers can specify a destination wallet");
            }

            await OwnershipPolicy.LockOwnedWalletsAsync(
                database, ownerId, cancellationToken,
                walletDestination == null ? [wallet.Id] : [wallet.Id, walletDestination.Id]);

            var sourceValue = isTransfer ? -value : value;

            try {
                var transaction = new TransactionDb {
                    Description = description,
                    LongDescription = longDescription,
                    Date = date,
                    WalletId = walletId,
                    TransactionTypeId = transactionTypeId,
                    UserId = ownerId,
                    UserInsertId = ownerId,
                    Value = sourceValue,
                };

                WalletBalancePolicy.Apply(wallet, sourceValue);
                database.Transactions.Add(transaction);
                await database.SaveChangesAsync(cancellationToken);

                if (walletDestination != null) {
                    var transactionDestination = new TransactionDb {
                        Description = description,
                        LongDescription = longDescription,
                        Date = date,
                        WalletId = walletDestination.Id,
                        TransactionTypeId = transactionTypeId,
                        UserId = ownerId,
                        UserInsertId = ownerId,
                        TransactionDestinationId = transaction.Id,
                        Value = value,
                    };

                    WalletBalancePolicy.Apply(walletDestination, value);
                    database.Transactions.Add(transactionDestination);
                    await database.SaveChangesAsync(cancellationToken);

                    transaction.TransactionDestinationId = transactionDestination.Id;

                    database.Transactions.Update(transaction);
                    await database.SaveChangesAsync(cancellationToken);
                }

                result = transaction.Id;
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsRetryable(exception)) {
                throw;
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Transaction reference not found");
            }
        }
    }
}

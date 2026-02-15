using database.Models;
using logic.Commands.Wallets;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using Mysqlx.Cursor;
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class UpdateTransactionCommand : ICommand<UInt64> {
        private UInt64 id;
        private String? description;
        private String? longDescription;
        private DateOnly? date;
        private UInt64? walletId;
        private UInt64? walletDestinationId;
        private Double? value;
        private UInt64? transactionTypeId;
        private UInt64? userId;
        private Boolean forceUpdate;
        private Boolean overwriteNull;

        public UpdateTransactionCommand(UInt64 id,
                String? description = null,
                String? longDescription = null,
                DateOnly? date = null,
                UInt64? walletId = null,
                UInt64? walletDestinationId = null,
                Double? value = null,
                UInt64? transactionTypeId = null,
                UInt64? userId = null,
                Boolean forceUpdate = false,
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
            this.forceUpdate = forceUpdate;
            this.overwriteNull = overwriteNull;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var currentTransaction = (await database.Transactions.FirstOrDefaultAsync(t => t.Id == id)) ?? throw new ObjectNotFoundException("Transaction to update not found");

            var restoreCurrentWalletValue = new UpdateWalletCurrentValueCommand(currentTransaction.WalletId, -currentTransaction.Value, isDifferenze: true, force: forceUpdate);
            await restoreCurrentWalletValue.Execute(executorManager);

            currentTransaction.Description = overwriteNull ? description : (description ?? currentTransaction.Description);
            currentTransaction.LongDescription = overwriteNull ? longDescription : (longDescription ?? currentTransaction.LongDescription);
            currentTransaction.Date = date?.ToDateTime(TimeOnly.MinValue) ?? currentTransaction.Date;
            currentTransaction.WalletId = walletId ?? currentTransaction.WalletId;
            currentTransaction.TransactionTypeId = transactionTypeId ?? currentTransaction.TransactionTypeId;
            currentTransaction.Value = currentTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id ? -Math.Abs(value ?? currentTransaction.Value) : (value ?? currentTransaction.Value);
            currentTransaction.UserId = userId ?? currentTransaction.UserId;

            var updateCurrentWalletValue = new UpdateWalletCurrentValueCommand(currentTransaction.WalletId, currentTransaction.Value, isDifferenze: true, force: forceUpdate);
            await updateCurrentWalletValue.Execute(executorManager);

            if ((currentTransaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id && walletDestinationId == null) ||
                (walletDestinationId != null && currentTransaction.TransactionTypeId != DatabaseInitializer.TRANSFER.Id)) {
                throw new ExecutorException("Not all data are in trnsfer");
            }

            if (overwriteNull && walletDestinationId == null && currentTransaction.TransactionDestinationId != null) {
                var destinationTransactionDb = database.Transactions.FirstOrDefault(t => t.Id == currentTransaction.TransactionDestinationId) ?? throw new ObjectNotFoundException("Transaction destination not found");

                var restoreCurrentWalletDestinationValue = new UpdateWalletCurrentValueCommand(destinationTransactionDb.WalletId, -destinationTransactionDb.Value, isDifferenze: true, force: forceUpdate);
                await restoreCurrentWalletDestinationValue.Execute(executorManager);

                database.Transactions.Remove(destinationTransactionDb);
                await database.SaveChangesAsync();

                currentTransaction.TransactionDestinationId = null;
            } else if (walletDestinationId != null && currentTransaction.TransactionDestinationId == null) {
                var destinationTransaction = new TransactionDb {
                    Description = currentTransaction.Description,
                    LongDescription = currentTransaction.LongDescription,
                    Date = currentTransaction.Date,
                    WalletId = walletDestinationId!.Value,
                    TransactionTypeId = DatabaseInitializer.TRANSFER.Id,
                    UserId = currentTransaction.UserId,
                    UserInsertId = currentTransaction.UserInsertId,
                    TransactionDestinationId = currentTransaction.Id,
                    Value = Math.Abs(currentTransaction.Value),
                };

                database.Transactions.Add(destinationTransaction);
                await database.SaveChangesAsync();

                currentTransaction.TransactionDestinationId = destinationTransaction.Id;

                var updateCurrentWalletDestinationValue = new UpdateWalletCurrentValueCommand(walletDestinationId!.Value, Math.Abs(currentTransaction.Value), isDifferenze: true, force: forceUpdate);
                await updateCurrentWalletDestinationValue.Execute(executorManager);
            } else if (walletDestinationId != null && currentTransaction.TransactionDestinationId != null) {
                var destinationTransactionDb = database.Transactions.FirstOrDefault(t => t.Id == currentTransaction.TransactionDestinationId) ?? throw new ObjectNotFoundException("Transaction destination not found");

                var restoreCurrentWalletDestinationValue = new UpdateWalletCurrentValueCommand(destinationTransactionDb.WalletId, -destinationTransactionDb.Value, isDifferenze: true, force: forceUpdate);
                await restoreCurrentWalletDestinationValue.Execute(executorManager);

                destinationTransactionDb.Description = currentTransaction.Description;
                destinationTransactionDb.LongDescription = currentTransaction.LongDescription;
                destinationTransactionDb.Date = currentTransaction.Date;
                destinationTransactionDb.WalletId = walletDestinationId.Value;
                destinationTransactionDb.Value = Math.Abs(currentTransaction.Value);
                destinationTransactionDb.TransactionTypeId = DatabaseInitializer.TRANSFER.Id;
                destinationTransactionDb.UserId = currentTransaction.UserId;

                var updateCurrentWalletDestinationValue = new UpdateWalletCurrentValueCommand(walletDestinationId!.Value, Math.Abs(currentTransaction.Value), isDifferenze: true, force: forceUpdate);
                await updateCurrentWalletDestinationValue.Execute(executorManager);

                database.Update(destinationTransactionDb);
                await database.SaveChangesAsync();
            }

            database.Update(currentTransaction);
            await database.SaveChangesAsync();

            result = currentTransaction.Id;
        }
    }
}

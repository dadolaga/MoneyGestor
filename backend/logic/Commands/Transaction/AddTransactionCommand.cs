using database.Models;
using logic.Commands.Wallets;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Transaction {
    public class AddTransactionCommand : ICommand<UInt64> {
        private String? description;
        private String? longDescription;
        private DateOnly date;
        private UInt64 walletId;
        private UInt64? walletDestinationId;
        private Double value;
        private UInt64 transactionTypeId;
        private UInt64? userId;
        private Boolean forceInsert;

        public AddTransactionCommand(String? description, String? longDescription, DateOnly date, UInt64 walletId, Double value, UInt64 transactionTypeId, UInt64? userId, UInt64? walletDestinationId = null, Boolean forceInsert = false) {
            this.description = description;
            this.longDescription = longDescription;
            this.date = date;
            this.walletId = walletId;
            this.walletDestinationId = walletDestinationId;
            this.value = value;
            this.transactionTypeId = transactionTypeId;
            this.userId = userId;
            this.forceInsert = forceInsert;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            if (await database.Wallets.FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == executorManager.UserId) == null) {
                throw new UserNotHavePermissionExcpetion();
            }

            if (walletDestinationId != null && await database.Wallets.FirstOrDefaultAsync(w => w.Id == walletDestinationId && w.UserId == executorManager.UserId) == null) {
                throw new UserNotHavePermissionExcpetion();
            }

            var transaction = new TransactionDb {
                Description = description,
                LongDescription = longDescription,
                Date = date.ToDateTime(TimeOnly.MinValue),
                WalletId = walletId,
                TransactionTypeId = transactionTypeId,
                UserId = userId,
                UserInsertId = executorManager.UserId,
                Value = walletDestinationId == null? value : -Math.Abs(value),
            };

            database.Transactions.Add(transaction);
            await database.SaveChangesAsync();

            var updateWalletCommand = new UpdateWalletCurrentValueCommand(walletId, walletDestinationId == null ? value : -Math.Abs(value), isDifferenze: true, force: forceInsert);
            await updateWalletCommand.Execute(executorManager);

            if (walletDestinationId != null) {
                var transactionDestination = new TransactionDb {
                    Description = description,
                    LongDescription = longDescription,
                    Date = date.ToDateTime(TimeOnly.MinValue),
                    WalletId = walletDestinationId.Value,
                    TransactionTypeId = transactionTypeId,
                    UserId = userId,
                    UserInsertId = executorManager.UserId,
                    TransactionDestinationId = transaction.Id,
                    Value = Math.Abs(value),
                };

                database.Transactions.Add(transactionDestination);
                await database.SaveChangesAsync();

                var updateDestinaionWalletCommand = new UpdateWalletCurrentValueCommand(walletDestinationId.Value, Math.Abs(value), isDifferenze: true, force: forceInsert);
                await updateDestinaionWalletCommand.Execute(executorManager);

                transaction.TransactionDestinationId = transactionDestination.Id;

                database.Transactions.Update(transaction);
                await database.SaveChangesAsync();
            }
            
            result = transaction.Id;
        }
    }
}

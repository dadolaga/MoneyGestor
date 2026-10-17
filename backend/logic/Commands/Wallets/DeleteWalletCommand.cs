using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class DeleteWalletCommand : ICommand<UInt64> {
        private UInt64 id;

        public DeleteWalletCommand(UInt64 id) {
            this.id = id;
        }

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            await logic.Security.OwnershipPolicy.LockOwnedWalletsAsync(database, executorManager.UserId, cancellationToken, id);

            var wallet = await logic.Security.OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                id,
                executorManager.UserId, cancellationToken);

            if (await database.Transactions.AnyAsync(t => t.WalletId == id, cancellationToken)) {
                throw new NotValidForDeleteException("Transaction not empty for delete wallet");
            }
            if (await database.Wallets.AnyAsync(item => item.LinkedAccountId == id, cancellationToken)) {
                throw new NotValidForDeleteException("Wallet has linked cards");
            }

            database.Wallets.Remove(wallet);

            await database.SaveChangesAsync(cancellationToken);

            return id;
        }
    }
}

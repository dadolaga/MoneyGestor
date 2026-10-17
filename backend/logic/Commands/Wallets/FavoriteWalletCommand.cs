using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class FavoriteWalletCommand : ICommand<UInt64> {
        private UInt64 walletId;
        private readonly Boolean favorite;

        public FavoriteWalletCommand(UInt64 walletId, Boolean favorite) {
            this.walletId = walletId;
            this.favorite = favorite;
        }

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            await OwnershipPolicy.LockOwnedWalletsAsync(database, executorManager.UserId, cancellationToken, walletId);

            var wallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, walletId, executorManager.UserId, cancellationToken);

            wallet.Favorite = favorite;

            await database.SaveChangesAsync(cancellationToken);

            return wallet.Id;
        }
    }
}

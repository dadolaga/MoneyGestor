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
        private Boolean? favorite;

        public FavoriteWalletCommand(UInt64 walletId, Boolean? favorite = null) {
            this.walletId = walletId;
            this.favorite = favorite;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;

            var wallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, walletId, executorManager.UserId, cancellationToken);

            wallet.Favorite = favorite ?? !wallet.Favorite;

            database.Update(wallet);

            await database.SaveChangesAsync(cancellationToken);

            result = wallet.Id;
        }
    }
}

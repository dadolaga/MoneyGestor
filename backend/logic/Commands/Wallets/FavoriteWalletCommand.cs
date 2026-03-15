using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Commands.Wallets {
    public class FavoriteWalletCommand : ICommand<UInt64> {
        private UInt64 walletId;
        private Boolean favorite;

        public FavoriteWalletCommand(UInt64 walletId, Boolean favorite) {
            this.walletId = walletId;
            this.favorite = favorite;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var wallet = database.Wallets.FirstOrDefault(w => w.Id == walletId && w.UserId == executorManager.UserId) ?? throw new ObjectNotFoundException("Wallet not found");

            wallet.Favorite = favorite;

            database.Update(wallet);

            await database.SaveChangesAsync();

            result = wallet.Id;
        }
    }
}

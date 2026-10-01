using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class UpdateWalletCurrentValueCommand : ICommand<UInt64> {
        private UInt64 walletId;
        private Decimal value;
        private Boolean isDifferenze;

        public UpdateWalletCurrentValueCommand(UInt64 walletId, Decimal value, Boolean isDifferenze = false) {
            this.walletId = walletId;
            this.value = value;
            this.isDifferenze = isDifferenze;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            logic.Security.MonetaryValuePolicy.RequireValid(value);
            await logic.Security.OwnershipPolicy.LockOwnedWalletsAsync(
                database,
                executorManager.UserId,
                cancellationToken,
                walletId);

            var wallet = await logic.Security.OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                walletId,
                executorManager.UserId, cancellationToken);

            if (isDifferenze) {
                logic.Security.WalletBalancePolicy.Apply(wallet, value);
            } else {
                logic.Security.WalletBalancePolicy.Set(wallet, value);
            }

            database.Update(wallet);

            await database.SaveChangesAsync(cancellationToken);

            result = wallet.Id;
        }
    }
}
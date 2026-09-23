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
        private Double value;
        private Boolean isDifferenze;

        public UpdateWalletCurrentValueCommand(UInt64 walletId, Double value, Boolean isDifferenze = false) {
            this.walletId = walletId;
            this.value = value;
            this.isDifferenze = isDifferenze;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var wallet = await logic.Security.OwnershipPolicy.RequireOwnedWalletAsync(
                database,
                walletId,
                executorManager.UserId);

            wallet.CurrentValue = isDifferenze ? (wallet.CurrentValue + value) : value;

            database.Update(wallet);

            await database.SaveChangesAsync();

            result = wallet.Id;
        }
    }
}

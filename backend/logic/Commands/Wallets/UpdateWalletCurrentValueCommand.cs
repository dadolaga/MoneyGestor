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
        private Boolean force;

        public UpdateWalletCurrentValueCommand(UInt64 walletId, Double value, Boolean isDifferenze = false, Boolean force = false) {
            this.walletId = walletId;
            this.value = value;
            this.isDifferenze = isDifferenze;
            this.force = force;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var wallet = await database.Wallets.FirstOrDefaultAsync(w => w.Id == walletId && w.UserId == executorManager.UserId) ?? throw new UserNotHavePermissionExcpetion();

            if (!force && isDifferenze && wallet.CurrentValue + value < 0) {
                throw new WalletGoesToNegative();
            }

            wallet.CurrentValue = isDifferenze ? (wallet.CurrentValue + value) : value;

            database.Update(wallet);

            await database.SaveChangesAsync();

            result = wallet.Id;
        }
    }
}

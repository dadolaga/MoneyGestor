using logic.Exceptions;
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

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            if (database.Transactions.Where(t => t.WalletId == id).Count() > 0) {
                throw new NotValidForDeleteException("Transaction not empty for delete wallet");
            }

            var wallet = database.Wallets.FirstOrDefault(w => w.Id == id && w.UserId == executorManager.UserId) ?? throw new UserNotHavePermissionExcpetion();

            database.Wallets.Remove(wallet);

            await database.SaveChangesAsync();

            result = id;
        }
    }
}

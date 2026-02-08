using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class AddNewWalletCommand : ICommand<UInt64> {
        private String name;
        private Double value;
        private UInt64 colorId;

        public AddNewWalletCommand(String name, Double value, UInt64 colorId) {
            this.name = name;
            this.value = value;
            this.colorId = colorId;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            executorManager.CheckUserLogged();

            var database = executorManager.DbContext;

            if (await database.Wallets.FirstOrDefaultAsync(w => w.UserId == executorManager.UserId && w.Name == name) != null) {
                throw new DuplicateObjectException($"Try to insert duplicate wallet");
            }

            var wallet = new WalletDb() {
                Name = name,
                Value = value,
                CurrentValue = value,
                Favorite = false,
                ColorId = colorId,
                UserId = executorManager.UserId
            };

            await database.AddAsync(wallet);

            await database.SaveChangesAsync();

            result = wallet.Id;
        }
    }
}

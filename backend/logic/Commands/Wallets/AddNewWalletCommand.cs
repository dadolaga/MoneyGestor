using database.Models;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class AddNewWalletCommand : ICommand<UInt64> {
        private String name;
        private Decimal value;
        private UInt64 colorId;

        public AddNewWalletCommand(String name, Decimal value, UInt64 colorId) {
            this.name = name;
            this.value = value;
            this.colorId = colorId;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            executorManager.CheckUserLogged();

            var database = executorManager.DbContext;
            MonetaryValuePolicy.RequireValid(value);

            await OwnershipPolicy.RequireAvailableColorAsync(database, colorId, executorManager.UserId, cancellationToken);

            if (await database.Wallets.AnyAsync(w => w.UserId == executorManager.UserId && w.Name == name, cancellationToken)) {
                throw new DuplicateObjectException($"Try to insert duplicate wallet");
            }

            var wallet = new WalletDb() {
                Name = name,
                Value = value,
                CurrentValue = value,
                BalanceVersion = 0,
                Favorite = false,
                ColorId = colorId,
                UserId = executorManager.UserId
            };

            await database.AddAsync(wallet, cancellationToken);

            try {
                await database.SaveChangesAsync(cancellationToken);
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
                throw new DuplicateObjectException("Try to insert duplicate wallet");
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Color not found");
            }

            result = wallet.Id;
        }
    }
}

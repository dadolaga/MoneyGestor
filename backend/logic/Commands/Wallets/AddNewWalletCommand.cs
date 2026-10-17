using database.Models;
using logic.Exceptions;
using logic.Security;
using logic.Models;
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
        private UInt64? colorId;
        private readonly UInt32? colorValue;
        private readonly WalletDetails? details;

        public AddNewWalletCommand(String name, Decimal value, UInt64? colorId, WalletDetails? details = null, UInt32? colorValue = null) {
            this.name = name;
            this.value = value;
            this.colorId = colorId;
            this.details = details;
            this.colorValue = colorValue;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            executorManager.CheckUserLogged();

            var database = executorManager.DbContext;
            MonetaryValuePolicy.RequireValid(value);

            if (String.IsNullOrWhiteSpace(name) || name.Trim().Length > 100) throw new WalletValidationException("name", "required");
            name = name.Trim();
            if (details != null && !WalletConfigurationPolicy.HasOwnBalance(details.Kind) && value != 0) throw new WalletValidationException("initialValue", "no_own_balance");
            if (details?.LinkedAccountId is UInt64 accountId) await OwnershipPolicy.LockOwnedWalletsAsync(database, executorManager.UserId, cancellationToken, accountId);
            var resolvedColorId = await WalletConfigurationPolicy.ResolveColorAsync(database, executorManager.UserId, colorId, colorValue, cancellationToken);

            if (await database.Wallets.AnyAsync(w => w.UserId == executorManager.UserId && w.Name == name, cancellationToken)) {
                throw new DuplicateObjectException($"Try to insert duplicate wallet");
            }

            var wallet = new WalletDb() {
                Name = name,
                Value = value,
                CurrentValue = value,
                BalanceVersion = 0,
                Favorite = false,
                ColorId = resolvedColorId,
                UserId = executorManager.UserId
            };

            if (details != null) await WalletConfigurationPolicy.ApplyAsync(database, wallet, details, executorManager.UserId, cancellationToken);

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

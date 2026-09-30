using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;

namespace logic.Commands.Wallets {
    public class EditWalletCommand : ICommand<UInt64> {
        private UInt64 walletIdToUpdate;
        private String? name;
        private UInt64? colorId;

        public EditWalletCommand(UInt64 walletIdToUpdate, String? name = null, UInt64? colorId = null) {
            this.walletIdToUpdate = walletIdToUpdate;
            this.name = name;
            this.colorId = colorId;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;

            var wallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, walletIdToUpdate, executorManager.UserId, cancellationToken);

            if (colorId != null) {
                await OwnershipPolicy.RequireAvailableColorAsync(database, colorId.Value, executorManager.UserId, cancellationToken);
            }

            if (await database.Wallets.AnyAsync(w => w.Id != walletIdToUpdate && w.UserId == executorManager.UserId && w.Name == name, cancellationToken)) {
                throw new DuplicateObjectException("Wallet already exist");
            }

            wallet.Name = name ?? wallet.Name;
            wallet.ColorId = colorId ?? wallet.ColorId;

            database.Update(wallet);

            try {
                await database.SaveChangesAsync(cancellationToken);
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
                throw new DuplicateObjectException("Wallet already exist");
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Color not found");
            }

            result = wallet.Id;
        }
    }
}

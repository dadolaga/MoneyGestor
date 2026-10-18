using logic.Exceptions;
using logic.Models;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.Wallets {
    public class EditWalletCommand(UInt64 walletIdToUpdate, String? name = null, UInt64? colorId = null, WalletDetails? details = null, UInt32? colorValue = null) : ICommand<UInt64> {
        private readonly UInt64 walletIdToUpdate = walletIdToUpdate;
        private String? name = name;
        private readonly UInt64? colorId = colorId;
        private readonly WalletDetails? details = details;
        private readonly UInt32? colorValue = colorValue;

        internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            await OwnershipPolicy.LockOwnedWalletsAsync(database, executorManager.UserId, cancellationToken,
                details?.LinkedAccountId is UInt64 accountId ? [walletIdToUpdate, accountId] : [walletIdToUpdate]);

            var wallet = await OwnershipPolicy.RequireOwnedWalletAsync(database, walletIdToUpdate, executorManager.UserId, cancellationToken);

            if (name != null && (String.IsNullOrWhiteSpace(name) || name.Trim().Length > 100)) {
                throw new WalletValidationException("name", "required");
            }

            name = name?.Trim();
            var resolvedColorId = colorId != null || colorValue != null
                ? await WalletConfigurationPolicy.ResolveColorAsync(database, executorManager.UserId, colorId, colorValue, cancellationToken)
                : wallet.ColorId;
            if (details != null) {
                await WalletConfigurationPolicy.ApplyAsync(database, wallet, details, executorManager.UserId, cancellationToken);
            }

            if (await database.Wallets.AnyAsync(w => w.Id != walletIdToUpdate && w.UserId == executorManager.UserId && w.Name == name, cancellationToken)) {
                throw new DuplicateObjectException("Wallet already exist");
            }

            wallet.Name = name ?? wallet.Name;
            wallet.ColorId = resolvedColorId;

            // Update only changed metadata; balances remain under the financial commands.

            try {
                await database.SaveChangesAsync(cancellationToken);
            } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
                throw new DuplicateObjectException("Wallet already exist");
            } catch (DbUpdateException) {
                throw new ObjectNotFoundException("Color not found");
            }

            return wallet.Id;
        }
    }
}
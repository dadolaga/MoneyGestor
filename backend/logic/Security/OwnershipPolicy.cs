using database;
using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

internal static class OwnershipPolicy {
    internal static async Task<WalletDb> RequireOwnedWalletAsync(
        MoneyGestorContext database,
        UInt64 walletId,
        UInt64 userId) =>
        await database.Wallets.FirstOrDefaultAsync(wallet => wallet.Id == walletId && wallet.UserId == userId)
            ?? throw new ObjectNotFoundException("Wallet not found");

    internal static async Task LockOwnedWalletsAsync(
        MoneyGestorContext database,
        UInt64 userId,
        params UInt64[] walletIds) {
        foreach (var walletId in walletIds.Distinct().OrderBy(id => id)) {
            var wallets = await database.Wallets
                .FromSqlInterpolated($$"""
                    SELECT * FROM `wallet`
                    WHERE `Id` = {{walletId}} AND `UserId` = {{userId}}
                    FOR UPDATE
                    """)
                .AsTracking()
                .ToListAsync();
            var wallet = wallets.SingleOrDefault();
            if (wallet == null) {
                throw new ObjectNotFoundException("Wallet not found");
            }
        }
    }

    internal static async Task<ColorDb> RequireAvailableColorAsync(
        MoneyGestorContext database,
        UInt64 colorId,
        UInt64 userId) =>
        await database.Colors.FirstOrDefaultAsync(color =>
            color.Id == colorId && (color.UserId == null || color.UserId == userId))
            ?? throw new ObjectNotFoundException("Color not found");

    internal static async Task<TransactionTypeDb> RequireAvailableTransactionTypeAsync(
        MoneyGestorContext database,
        UInt64 transactionTypeId,
        UInt64 userId) =>
        await database.TransactionTypes.FirstOrDefaultAsync(type =>
            type.Id == transactionTypeId && (type.UserId == null || type.UserId == userId))
            ?? throw new ObjectNotFoundException("Transaction type not found");
}

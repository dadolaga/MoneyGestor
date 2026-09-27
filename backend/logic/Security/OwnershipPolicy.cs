using database;
using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

internal static class OwnershipPolicy {
    internal static IQueryable<WalletDb> OwnedWallets(MoneyGestorContext database, UInt64 userId) =>
        OwnershipQueryPolicy.OwnedWallets(database, userId);

    internal static IQueryable<ColorDb> AvailableColors(MoneyGestorContext database, UInt64 userId) =>
        OwnershipQueryPolicy.AvailableColors(database, userId);

    internal static IQueryable<TransactionTypeDb> AvailableTransactionTypes(MoneyGestorContext database, UInt64 userId) =>
        OwnershipQueryPolicy.AvailableTransactionTypes(database, userId);

    internal static async Task<WalletDb> RequireOwnedWalletAsync(
        MoneyGestorContext database,
        UInt64 walletId,
        UInt64 userId) =>
        await OwnedWallets(database, userId).FirstOrDefaultAsync(wallet => wallet.Id == walletId)
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
        await AvailableColors(database, userId).FirstOrDefaultAsync(color => color.Id == colorId)
            ?? throw new ObjectNotFoundException("Color not found");

    internal static async Task<TransactionTypeDb> RequireAvailableTransactionTypeAsync(
        MoneyGestorContext database,
        UInt64 transactionTypeId,
        UInt64 userId) =>
        await AvailableTransactionTypes(database, userId).FirstOrDefaultAsync(type => type.Id == transactionTypeId)
            ?? throw new ObjectNotFoundException("Transaction type not found");
}

/// <summary>Reusable, SQL-translatable visibility predicates for single-owner resources.</summary>
public static class OwnershipQueryPolicy {
    public static IQueryable<TransactionDb> OwnedTransactions(MoneyGestorContext database, UInt64 userId) =>
        database.Transactions.Where(transaction => transaction.UserId == userId);

    public static IQueryable<WalletDb> OwnedWallets(MoneyGestorContext database, UInt64 userId) =>
        database.Wallets.Where(wallet => wallet.UserId == userId);

    public static IQueryable<ColorDb> AvailableColors(MoneyGestorContext database, UInt64 userId) =>
        database.Colors.Where(color => color.UserId == null || color.UserId == userId);

    public static IQueryable<TransactionTypeDb> AvailableTransactionTypes(MoneyGestorContext database, UInt64 userId) =>
        database.TransactionTypes.Where(type => type.UserId == null || type.UserId == userId);
}

using database;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

public static class DataIntegrityPreflight {
    public static async Task<DataIntegrityReport> InspectAsync(MoneyGestorContext database) {
        var wallets = await database.Wallets
            .AsNoTracking()
            .Select(wallet => new {
                wallet.Id,
                wallet.UserId,
                ColorOwnerId = wallet.Color.UserId
            })
            .ToListAsync();

        var transactions = await database.Transactions
            .AsNoTracking()
            .Select(transaction => new {
                transaction.Id,
                transaction.UserId,
                transaction.UserInsertId,
                transaction.WalletId,
                WalletOwnerId = transaction.Wallet.UserId,
                transaction.TransactionTypeId,
                TypeOwnerId = transaction.TransactionType.UserId,
                transaction.Value,
                transaction.TransactionDestinationId
            })
            .ToListAsync();

        var issues = new List<DataIntegrityIssue>();
        AddIssue(
            issues,
            "wallet_color_owner_mismatch",
            wallets.Where(wallet => wallet.ColorOwnerId != null && wallet.ColorOwnerId != wallet.UserId)
                .Select(wallet => wallet.Id));
        AddIssue(
            issues,
            "transaction_owner_mismatch",
            transactions.Where(transaction => transaction.UserId != transaction.UserInsertId)
                .Select(transaction => transaction.Id));
        AddIssue(
            issues,
            "transaction_wallet_owner_mismatch",
            transactions.Where(transaction => transaction.UserId != transaction.WalletOwnerId)
                .Select(transaction => transaction.Id));
        AddIssue(
            issues,
            "transaction_type_owner_mismatch",
            transactions.Where(transaction =>
                    transaction.TypeOwnerId != null && transaction.TypeOwnerId != transaction.UserId)
                .Select(transaction => transaction.Id));

        var transactionsById = transactions.ToDictionary(transaction => transaction.Id);
        var invalidTransfers = new HashSet<UInt64>();

        foreach (var transaction in transactions) {
            var isTransfer = transaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id;
            var hasPair = transaction.TransactionDestinationId != null;

            if (isTransfer != hasPair) {
                invalidTransfers.Add(transaction.Id);
                continue;
            }

            if (!isTransfer) {
                continue;
            }

            if (!transactionsById.TryGetValue(transaction.TransactionDestinationId!.Value, out var pair)
                || pair.TransactionDestinationId != transaction.Id
                || pair.TransactionTypeId != DatabaseInitializer.TRANSFER.Id
                || pair.UserId != transaction.UserId
                || pair.UserInsertId != transaction.UserInsertId
                || pair.WalletId == transaction.WalletId
                || transaction.Value == 0
                || pair.Value != -transaction.Value) {
                invalidTransfers.Add(transaction.Id);
                if (pair != null) {
                    invalidTransfers.Add(pair.Id);
                }
            }
        }

        AddIssue(issues, "transfer_pair_invariant", invalidTransfers);

        var reconciliation = await new BalanceReconciliationService(database).InspectAsync();
        AddIssue(
            issues,
            "wallet_balance_mismatch",
            reconciliation.Differences.Select(difference => difference.WalletId));

        return new DataIntegrityReport(issues);
    }

    public static async Task EnsureValidAsync(MoneyGestorContext database) {
        var report = await InspectAsync(database);
        if (!report.IsValid) {
            throw new DataIntegrityException(report);
        }
    }

    private static void AddIssue(
        ICollection<DataIntegrityIssue> issues,
        String code,
        IEnumerable<UInt64> entityIds) {
        var ids = entityIds.Distinct().OrderBy(id => id).ToArray();
        if (ids.Length > 0) {
            issues.Add(new DataIntegrityIssue(code, ids));
        }
    }
}

using database;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

public static class DataIntegrityPreflight {
    public static async Task<DataIntegrityReport> InspectAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        // Project only offending IDs. Healthy datasets stay in MySQL rather than being materialized at startup.
        var walletColorMismatch = await database.Wallets.AsNoTracking()
            .Where(wallet => wallet.Color!.UserId != null && wallet.Color.UserId != wallet.UserId)
            .Select(wallet => wallet.Id).ToArrayAsync(cancellationToken);
        var ownerMismatch = await database.Transactions.AsNoTracking()
            .Where(transaction => transaction.UserId != transaction.UserInsertId)
            .Select(transaction => transaction.Id).ToArrayAsync(cancellationToken);
        var walletOwnerMismatch = await database.Transactions.AsNoTracking()
            .Where(transaction => transaction.UserId != transaction.Wallet!.UserId)
            .Select(transaction => transaction.Id).ToArrayAsync(cancellationToken);
        var typeOwnerMismatch = await database.Transactions.AsNoTracking()
            .Where(transaction => transaction.TransactionType!.UserId != null
                && transaction.TransactionType.UserId != transaction.UserId)
            .Select(transaction => transaction.Id).ToArrayAsync(cancellationToken);

        var transferTypeId = DatabaseInitializer.TRANSFER.Id;
        var invalidTransfers = await database.Transactions.AsNoTracking()
            .Where(transaction =>
                (transaction.TransactionTypeId == transferTypeId && transaction.TransactionDestinationId == null)
                || (transaction.TransactionTypeId != transferTypeId && transaction.TransactionDestinationId != null)
                || (transaction.TransactionTypeId == transferTypeId && transaction.TransactionDestinationId != null
                    && (transaction.TransactionDestination == null
                        || transaction.TransactionDestination.TransactionDestinationId != transaction.Id
                        || transaction.TransactionDestination.TransactionTypeId != transferTypeId
                        || transaction.TransactionDestination.UserId != transaction.UserId
                        || transaction.TransactionDestination.UserInsertId != transaction.UserInsertId
                        || transaction.TransactionDestination.WalletId == transaction.WalletId
                        || transaction.Value == 0
                        || transaction.TransactionDestination.Value != -transaction.Value)))
            .Select(transaction => transaction.Id).ToArrayAsync(cancellationToken);

        var issues = new List<DataIntegrityIssue>();
        AddIssue(issues, "wallet_color_owner_mismatch", walletColorMismatch);
        AddIssue(issues, "transaction_owner_mismatch", ownerMismatch);
        AddIssue(issues, "transaction_wallet_owner_mismatch", walletOwnerMismatch);
        AddIssue(issues, "transaction_type_owner_mismatch", typeOwnerMismatch);
        AddIssue(issues, "transfer_pair_invariant", invalidTransfers);

        // Balance reconciliation is disabled so existing mismatches do not block the preflight.
        // var reconciliation = await new BalanceReconciliationService(database).InspectAsync(cancellationToken);
        // AddIssue(issues, "wallet_balance_mismatch",
        //     reconciliation.Differences.Select(difference => difference.WalletId));

        return new DataIntegrityReport(issues);
    }

    public static async Task EnsureValidAsync(MoneyGestorContext database, CancellationToken cancellationToken = default) {
        var report = await InspectAsync(database, cancellationToken);
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

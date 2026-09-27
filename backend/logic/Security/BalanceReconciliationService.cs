using database;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

public sealed class BalanceReconciliationService(MoneyGestorContext database) {
    public async Task<BalanceReconciliationReport> InspectAsync(CancellationToken cancellationToken = default) {
        var wallets = await database.Wallets
            .AsNoTracking()
            .Select(wallet => new { wallet.Id, wallet.Value, wallet.CurrentValue })
            .ToListAsync(cancellationToken);
        var ledgerByWallet = await database.Transactions
            .AsNoTracking()
            .GroupBy(transaction => transaction.WalletId)
            .Select(group => new { WalletId = group.Key, Value = group.Sum(transaction => transaction.Value) })
            .ToDictionaryAsync(entry => entry.WalletId, entry => entry.Value, cancellationToken);

        var differences = wallets
            .Select(wallet => new BalanceDifference(
                wallet.Id,
                wallet.CurrentValue - (wallet.Value + ledgerByWallet.GetValueOrDefault(wallet.Id))))
            .Where(difference => difference.Difference != 0m)
            .OrderBy(difference => difference.WalletId)
            .ToArray();

        return new BalanceReconciliationReport(differences);
    }

    public async Task EnsureValidAsync(CancellationToken cancellationToken = default) {
        var report = await InspectAsync(cancellationToken);
        if (!report.IsValid) {
            throw new DataIntegrityException(new DataIntegrityReport([
                new DataIntegrityIssue(
                    "wallet_balance_mismatch",
                    report.Differences.Select(difference => difference.WalletId).ToArray())
            ]));
        }
    }
}

public sealed record BalanceDifference(UInt64 WalletId, Decimal Difference);

public sealed record BalanceReconciliationReport(IReadOnlyList<BalanceDifference> Differences) {
    public Boolean IsValid => Differences.Count == 0;
}

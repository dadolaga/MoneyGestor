using database;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;

namespace logic.Security;

public sealed class BalanceReconciliationService(MoneyGestorContext database) {
    public async Task<BalanceReconciliationReport> InspectAsync(CancellationToken cancellationToken = default) {
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT wallet.Id,
                   wallet.CurrentValue - (wallet.Value + COALESCE(ledger.Value, 0)) AS Difference
            FROM wallet
            LEFT JOIN (
                SELECT WalletId, SUM(Value) AS Value
                FROM `transaction`
                GROUP BY WalletId
            ) ledger ON ledger.WalletId = wallet.Id
            WHERE wallet.CurrentValue <> wallet.Value + COALESCE(ledger.Value, 0)
            ORDER BY wallet.Id
            """;
        command.Transaction = database.Database.CurrentTransaction?.GetDbTransaction();

        var connection = command.Connection!;
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere)
            await connection.OpenAsync(cancellationToken);

        try {
            var differences = new List<BalanceDifference>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                differences.Add(new BalanceDifference(
                    Convert.ToUInt64(reader.GetValue(0)), reader.GetDecimal(1)));
            return new BalanceReconciliationReport(differences);
        } finally {
            if (openedHere)
                await connection.CloseAsync();
        }
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

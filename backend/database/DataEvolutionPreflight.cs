using Microsoft.EntityFrameworkCore;
using System.Data;

namespace database;

public static class DataEvolutionPreflight {
    public const String MigrationId = "20260927112400_DataPrecisionDatesAndBalanceConcurrency";

    public static async Task EnsureValidAsync(
        MoneyGestorContext database,
        CancellationToken cancellationToken = default) {
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT issue_code, entity_id
            FROM (
                SELECT 'wallet_value_not_decimal_19_2' AS issue_code, Id AS entity_id
                FROM wallet
                WHERE Value <> CAST(Value AS DECIMAL(19,2))
                   OR ABS(Value) > 99999999999999999.99
                UNION ALL
                SELECT 'wallet_current_value_not_decimal_19_2', Id
                FROM wallet
                WHERE CurrentValue <> CAST(CurrentValue AS DECIMAL(19,2))
                   OR ABS(CurrentValue) > 99999999999999999.99
                UNION ALL
                SELECT 'transaction_value_not_decimal_19_2', Id
                FROM `transaction`
                WHERE Value <> CAST(Value AS DECIMAL(19,2))
                   OR ABS(Value) > 99999999999999999.99
                   OR Value = 0
                UNION ALL
                SELECT 'transaction_date_has_time', Id
                FROM `transaction`
                WHERE HOUR(`Date`) <> 0
                   OR MINUTE(`Date`) <> 0
                   OR SECOND(`Date`) <> 0
                   OR MICROSECOND(`Date`) <> 0
                UNION ALL
                SELECT 'transaction_description_too_long', Id
                FROM `transaction`
                WHERE CHAR_LENGTH(Description) > 255
                UNION ALL
                SELECT 'transaction_long_description_too_long', Id
                FROM `transaction`
                WHERE CHAR_LENGTH(LongDescription) > 4000
                UNION ALL
                SELECT 'wallet_balance_mismatch', wallet.Id
                FROM wallet
                LEFT JOIN (
                    SELECT WalletId, SUM(Value) AS ledger_value
                    FROM `transaction`
                    GROUP BY WalletId
                ) ledger ON ledger.WalletId = wallet.Id
                WHERE CAST(wallet.CurrentValue AS DECIMAL(19,2)) <>
                      CAST(wallet.Value + COALESCE(ledger.ledger_value, 0) AS DECIMAL(19,2))
            ) issues
            ORDER BY issue_code, entity_id
            """;

        var connection = command.Connection!;
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) {
            await connection.OpenAsync(cancellationToken);
        }

        try {
            var issues = new Dictionary<String, List<UInt64>>(StringComparer.Ordinal);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken)) {
                var code = reader.GetString(0);
                var id = Convert.ToUInt64(reader.GetValue(1));
                issues.TryAdd(code, []);
                issues[code].Add(id);
            }

            if (issues.Count > 0) {
                var summary = String.Join("; ", issues.Select(issue =>
                    $"{issue.Key}={issue.Value.Count} [{String.Join(',', issue.Value)}]"));
                throw new DataEvolutionException(
                    $"DAT-22/DAT-23 migration preflight failed: {summary}");
            }
        } finally {
            if (openedHere) {
                await connection.CloseAsync();
            }
        }
    }
}

public sealed class DataEvolutionException(String message) : InvalidOperationException(message);

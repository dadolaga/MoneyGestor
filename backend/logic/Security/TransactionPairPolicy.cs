using database;
using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Security;

internal static class TransactionPairPolicy {
    internal static async Task<TransactionDb> LockOwnedTransactionAsync(
        MoneyGestorContext database,
        UInt64 transactionId,
        UInt64 userId) {
        var locked = await database.Transactions
            .FromSqlInterpolated($$"""
                SELECT * FROM `transaction`
                WHERE (`Id` = {{transactionId}} OR `TransactionDestinationId` = {{transactionId}})
                  AND `UserId` = {{userId}}
                ORDER BY `Id`
                FOR UPDATE
                """)
            .AsTracking()
            .ToListAsync();
        var requested = locked.SingleOrDefault(transaction => transaction.Id == transactionId)
            ?? throw new ObjectNotFoundException("Transaction not found");
        await database.Entry(requested).Reference(transaction => transaction.TransactionDestination).LoadAsync();
        return requested;
    }

    internal static (TransactionDb Source, TransactionDb Destination) RequireValidTransferPair(
        TransactionDb transaction) {
        var pair = transaction.TransactionDestination;
        var isValid = transaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
            && transaction.TransactionDestinationId != null
            && pair != null
            && pair.TransactionTypeId == DatabaseInitializer.TRANSFER.Id
            && pair.TransactionDestinationId == transaction.Id
            && pair.UserId == transaction.UserId
            && pair.UserInsertId == transaction.UserInsertId
            && pair.WalletId != transaction.WalletId
            && transaction.Value != 0
            && pair.Value == -transaction.Value;

        if (!isValid) {
            var ids = pair == null
                ? new[] { transaction.Id }
                : new[] { transaction.Id, pair.Id }.Distinct().OrderBy(id => id).ToArray();
            throw new DataIntegrityException(new DataIntegrityReport(new[] {
                new DataIntegrityIssue("transfer_pair_invariant", ids)
            }));
        }

        return transaction.Value < 0
            ? (transaction, pair!)
            : (pair!, transaction);
    }
}

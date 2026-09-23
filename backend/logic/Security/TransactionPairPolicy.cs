using database.Models;
using logic.Exceptions;

namespace logic.Security;

internal static class TransactionPairPolicy {
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

using logic.Exceptions;
using logic.Models;
using logic.Security;
using Microsoft.EntityFrameworkCore;

namespace logic.Commands.Transaction;

public sealed class EditTransactionTypeCommand(UInt64 categoryId, String name, TransactionTypeDetails details) : ICommand<UInt64> {
    internal override async Task<UInt64> ExecuteAsync(ExecutorManager executorManager, CancellationToken cancellationToken) {
        var database = executorManager.DbContext;
        var ownerId = executorManager.UserId;
        await TransactionTypeConfigurationPolicy.LockOwnerAsync(database, ownerId, cancellationToken);
        var category = await database.TransactionTypes.SingleOrDefaultAsync(
            type => type.Id == categoryId && type.UserId == ownerId
                && type.Id != DatabaseInitializer.TRANSFER.Id && type.Id != DatabaseInitializer.ADJUSTMENT.Id,
            cancellationToken) ?? throw new ObjectNotFoundException("Transaction type not found");

        TransactionTypeConfigurationPolicy.Validate(name, details);
        await TransactionTypeConfigurationPolicy.ValidateParentAsync(database, ownerId, details.ParentId, categoryId, cancellationToken);
        var normalizedName = name.Trim();
        if (await database.TransactionTypes.AnyAsync(type => type.UserId == ownerId && type.Id != categoryId
            && type.Name == normalizedName, cancellationToken)) {
            throw new DuplicateObjectException("This transaction type already exists");
        }

        TransactionTypeConfigurationPolicy.Apply(category, normalizedName, details);
        try {
            await database.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException exception) when (DatabaseUpdatePolicy.IsDuplicateEntry(exception)) {
            throw new DuplicateObjectException("This transaction type already exists");
        }
        return category.Id;
    }
}

using logic;
using logic.Commands.Transaction;
using logic.Commands.Wallets;

namespace webserver.Api.V1;

public interface IResourceCommandService {
    Task<UInt64> CreateWalletAsync(UInt64 userId, CreateWalletRequest request, CancellationToken cancellationToken = default);
    Task<UInt64> UpdateWalletAsync(UInt64 userId, UInt64 id, UpdateWalletRequest request, CancellationToken cancellationToken = default);
    Task<UInt64> DeleteWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken = default);
    Task<UInt64> SetWalletFavoriteAsync(UInt64 userId, UInt64 id, Boolean favorite, CancellationToken cancellationToken = default);
    Task<UInt64> CreateTransactionTypeAsync(UInt64 userId, CreateTransactionTypeRequest request, CancellationToken cancellationToken = default);
    Task<UInt64> CreateTransactionAsync(UInt64 userId, CreateTransactionRequest request, CancellationToken cancellationToken = default);
    Task<UInt64> UpdateTransactionAsync(UInt64 userId, UInt64 id, UpdateTransactionRequest request, CancellationToken cancellationToken = default);
    Task<UInt64> DeleteTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken = default);
}

/// <summary>Thin v1 use cases that pass the Identity-resolved owner to the existing transactional commands.</summary>
public sealed class ResourceCommandService(ExecutorManager executor) : IResourceCommandService {
    public async Task<UInt64> CreateWalletAsync(UInt64 userId, CreateWalletRequest request, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new AddNewWalletCommand(request.Name.Trim(), request.InitialValue, request.ColorId);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> UpdateWalletAsync(UInt64 userId, UInt64 id, UpdateWalletRequest request, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new EditWalletCommand(id, request.Name, request.ColorId);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> DeleteWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new DeleteWalletCommand(id);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> SetWalletFavoriteAsync(UInt64 userId, UInt64 id, Boolean favorite, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new FavoriteWalletCommand(id, favorite);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> CreateTransactionTypeAsync(UInt64 userId, CreateTransactionTypeRequest request, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new AddTransactionTypeCommand(request.Name.Trim());
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> CreateTransactionAsync(UInt64 userId, CreateTransactionRequest request, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new AddTransactionCommand(request.Description, request.LongDescription, request.Date!.Value,
            request.WalletId, request.Value, request.TypeId, userId: null, request.DestinationWalletId);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> UpdateTransactionAsync(UInt64 userId, UInt64 id, UpdateTransactionRequest request, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new UpdateTransactionCommand(id, request.Description, request.LongDescription, request.Date,
            request.WalletId, request.DestinationWalletId, request.Value, request.TypeId, userId: null,
            overwriteNull: false,
            overwriteDescription: request.DescriptionSpecified,
            overwriteLongDescription: request.LongDescriptionSpecified);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }

    public async Task<UInt64> DeleteTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken = default) {
        executor.UseAuthenticatedUser(userId);
        var command = new DeleteTransactionCommand(id);
        await executor.Execute(command, cancellationToken);
        return command.Result;
    }
}

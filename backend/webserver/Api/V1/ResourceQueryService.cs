using database;
using database.Identity;
using logic;
using logic.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace webserver.Api.V1;

public interface IApiCurrentUser {
    Task<UInt64> RequireIdAsync(ClaimsPrincipal principal);
}

public sealed class ApiCurrentUser(UserManager<ApplicationIdentityUser> users) : IApiCurrentUser {
    public async Task<UInt64> RequireIdAsync(ClaimsPrincipal principal) =>
        (await users.GetUserAsync(principal))?.LegacyUserId
        ?? throw new UnauthorizedAccessException("Authenticated account mapping is unavailable.");
}

public interface IResourceQueryService {
    Task<IReadOnlyList<ColorResponse>> GetColorsAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<WalletResponse>> GetWalletsAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<WalletResponse?> GetWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<IReadOnlyList<TransactionTypeResponse>> GetTransactionTypesAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<TransactionTypeResponse?> GetTransactionTypeAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<PageResponse<TransactionResponse>> GetTransactionsAsync(UInt64 userId, PageQuery page, CancellationToken cancellationToken);
    Task<TransactionResponse?> GetTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<DashboardResponse> GetDashboardAsync(UInt64 userId, DashboardQuery range, CancellationToken cancellationToken);
}

public sealed class ResourceQueryService(MoneyGestorContext database) : IResourceQueryService {
    public async Task<IReadOnlyList<ColorResponse>> GetColorsAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.AvailableColors(database, userId).AsNoTracking()
            .OrderBy(color => color.Id)
            .Select(color => new ColorResponse(color.Id, color.Name, color.Value))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WalletResponse>> GetWalletsAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.OwnedWallets(database, userId).AsNoTracking()
            .OrderBy(wallet => wallet.Id)
            .Select(wallet => new WalletResponse(
                wallet.Id, wallet.Name, wallet.Value, wallet.CurrentValue, wallet.Favorite,
                new ColorResponse(wallet.Color.Id, wallet.Color.Name, wallet.Color.Value)))
            .ToListAsync(cancellationToken);

    public Task<WalletResponse?> GetWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.OwnedWallets(database, userId).AsNoTracking()
            .Where(wallet => wallet.Id == id)
            .Select(wallet => new WalletResponse(wallet.Id, wallet.Name, wallet.Value, wallet.CurrentValue, wallet.Favorite,
                new ColorResponse(wallet.Color.Id, wallet.Color.Name, wallet.Color.Value)))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<TransactionTypeResponse>> GetTransactionTypesAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.AvailableTransactionTypes(database, userId).AsNoTracking()
            .OrderBy(type => type.Id)
            .Select(type => new TransactionTypeResponse(type.Id, type.Name, type.UserId == null))
            .ToListAsync(cancellationToken);

    public Task<TransactionTypeResponse?> GetTransactionTypeAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.AvailableTransactionTypes(database, userId).AsNoTracking()
            .Where(type => type.Id == id)
            .Select(type => new TransactionTypeResponse(type.Id, type.Name, type.UserId == null))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<PageResponse<TransactionResponse>> GetTransactionsAsync(UInt64 userId, PageQuery page, CancellationToken cancellationToken) {
        var offset = (Int64)(page.Page - 1) * page.PageSize;
        if (offset > Int32.MaxValue)
            throw new logic.Exceptions.ListFilterValidationException("page", "out_of_range");
        var rows = OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.TransactionTypeId != DatabaseInitializer.TRANSFER.Id || transaction.Value < 0);
        var count = await rows.LongCountAsync(cancellationToken);
        var items = await rows
            .OrderByDescending(transaction => transaction.Date)
            .ThenByDescending(transaction => transaction.Id)
            .Skip((Int32)offset)
            .Take(page.PageSize)
            .Select(transaction => new TransactionResponse(
                transaction.Id,
                transaction.Description,
                transaction.LongDescription,
                transaction.Date,
                transaction.Value,
                new TransactionTypeResponse(transaction.TransactionType.Id, transaction.TransactionType.Name, transaction.TransactionType.UserId == null),
                new TransactionWalletResponse(transaction.Wallet.Id, transaction.Wallet.Name,
                    new ColorResponse(transaction.Wallet.Color.Id, transaction.Wallet.Color.Name, transaction.Wallet.Color.Value)),
                transaction.TransactionDestination == null ? null : new TransactionWalletResponse(
                    transaction.TransactionDestination.Wallet.Id,
                    transaction.TransactionDestination.Wallet.Name,
                    new ColorResponse(
                        transaction.TransactionDestination.Wallet.Color.Id,
                        transaction.TransactionDestination.Wallet.Color.Name,
                        transaction.TransactionDestination.Wallet.Color.Value))))
            .ToListAsync(cancellationToken);
        return new PageResponse<TransactionResponse>(page.Page, page.PageSize, count, items);
    }

    public Task<TransactionResponse?> GetTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.Id == id)
            .Select(transaction => new TransactionResponse(
                transaction.Id, transaction.Description, transaction.LongDescription, transaction.Date, transaction.Value,
                new TransactionTypeResponse(transaction.TransactionType.Id, transaction.TransactionType.Name, transaction.TransactionType.UserId == null),
                new TransactionWalletResponse(transaction.Wallet.Id, transaction.Wallet.Name,
                    new ColorResponse(transaction.Wallet.Color.Id, transaction.Wallet.Color.Name, transaction.Wallet.Color.Value)),
                transaction.TransactionDestination == null ? null : new TransactionWalletResponse(
                    transaction.TransactionDestination.Wallet.Id,
                    transaction.TransactionDestination.Wallet.Name,
                    new ColorResponse(transaction.TransactionDestination.Wallet.Color.Id,
                        transaction.TransactionDestination.Wallet.Color.Name, transaction.TransactionDestination.Wallet.Color.Value))))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<DashboardResponse> GetDashboardAsync(UInt64 userId, DashboardQuery range, CancellationToken cancellationToken) {
        var from = range.From!.Value;
        var to = range.To!.Value;
        if (from > to) throw new logic.Exceptions.ListFilterValidationException("to", "invalid_date_range");
        var transactions = OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.TransactionDestinationId == null && transaction.Date >= from && transaction.Date <= to);
        var incoming = await transactions.Where(transaction => transaction.Value > 0)
            .Select(transaction => transaction.Value).DefaultIfEmpty(0m).SumAsync(cancellationToken);
        var expense = await transactions.Where(transaction => transaction.Value < 0)
            .Select(transaction => transaction.Value).DefaultIfEmpty(0m).SumAsync(cancellationToken);
        var categories = await transactions.GroupBy(transaction => new {
                transaction.TransactionTypeId,
                transaction.TransactionType.Name,
                transaction.TransactionType.UserId
            })
            .Select(group => new {
                group.Key.TransactionTypeId,
                group.Key.Name,
                IsGlobal = group.Key.UserId == null,
                Value = group.Sum(transaction => transaction.Value)
            })
            .ToListAsync(cancellationToken);
        var typeValues = categories.Select(item => new DashboardCategoryResponse(
            new TransactionTypeResponse(item.TransactionTypeId, item.Name, item.IsGlobal), item.Value)).ToArray();
        return new DashboardResponse(incoming, expense,
            typeValues.Where(item => item.Value > 0).ToArray(),
            typeValues.Where(item => item.Value < 0).ToArray());
    }
}

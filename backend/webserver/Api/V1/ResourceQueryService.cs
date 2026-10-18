using database;
using logic;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace webserver.Api.V1;

public interface IResourceQueryService {
    Task<IReadOnlyList<ColorResponse>> GetColorsAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<WalletResponse>> GetWalletsAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<WalletResponse?> GetWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<IReadOnlyList<TransactionTypeResponse>> GetTransactionTypesAsync(UInt64 userId, CancellationToken cancellationToken);
    Task<TransactionTypeResponse?> GetTransactionTypeAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<PageResponse<TransactionResponse>> GetTransactionsAsync(UInt64 userId, TransactionListQuery query, CancellationToken cancellationToken);
    Task<TransactionOverview> GetTransactionOverviewAsync(UInt64 userId, TransactionFilterQuery query, CancellationToken cancellationToken);
    IAsyncEnumerable<TransactionResponse> ExportTransactions(UInt64 userId, TransactionFilterQuery query);
    Task<TransactionResponse?> GetTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken);
    Task<DashboardResponse> GetDashboardAsync(UInt64 userId, DashboardQuery range, CancellationToken cancellationToken);
}

public sealed partial class ResourceQueryService(MoneyGestorContext database) : IResourceQueryService {
    // Required FK navigations are translated to SQL joins in these EF queries.
    private static Expression<Func<global::database.Models.TransactionDb, TransactionResponse>> TransactionProjection() => transaction => new TransactionResponse(
        transaction.Id, transaction.Description, transaction.LongDescription, transaction.Date, transaction.Value,
        new TransactionTypeResponse(transaction.TransactionType!.Id, transaction.TransactionType!.Name, transaction.TransactionType!.UserId == null) {
            ParentId = transaction.TransactionType!.ParentId, Icon = transaction.TransactionType!.Icon, Color = transaction.TransactionType!.Color, Description = transaction.TransactionType!.Description,
            Keywords = transaction.TransactionType!.Keywords, UseInReports = transaction.TransactionType!.UseInReports,
            SystemKind = transaction.TransactionType!.Id == DatabaseInitializer.TRANSFER.Id ? "Transfer" : transaction.TransactionType!.Id == DatabaseInitializer.ADJUSTMENT.Id ? "Adjustment" : null
        },
        new TransactionWalletResponse(transaction.Wallet!.Id, transaction.Wallet!.Name,
            new ColorResponse(transaction.Wallet!.Color!.Id, transaction.Wallet!.Color!.Name, transaction.Wallet!.Color!.Value) { IsGlobal = transaction.Wallet!.Color!.UserId == null }),
        transaction.TransactionDestination == null ? null : new TransactionWalletResponse(
            transaction.TransactionDestination.Wallet!.Id,
            transaction.TransactionDestination.Wallet!.Name,
            new ColorResponse(transaction.TransactionDestination.Wallet!.Color!.Id,
                transaction.TransactionDestination.Wallet!.Color!.Name, transaction.TransactionDestination.Wallet!.Color!.Value) {
                IsGlobal = transaction.TransactionDestination.Wallet!.Color!.UserId == null
            }));

    public async Task<IReadOnlyList<ColorResponse>> GetColorsAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.AvailableColors(database, userId).AsNoTracking()
            .OrderBy(color => color.Id)
            .Select(color => new ColorResponse(color.Id, color.Name, color.Value) { IsGlobal = color.UserId == null })
            .ToListAsync(cancellationToken);

    private static Expression<Func<global::database.Models.WalletDb, WalletResponse>> WalletProjection() => wallet => new WalletResponse(
        wallet.Id, wallet.Name, wallet.Value, wallet.CurrentValue, wallet.Favorite,
        new ColorResponse(wallet.Color!.Id, wallet.Color!.Name, wallet.Color!.Value) { IsGlobal = wallet.Color.UserId == null }) {
        HasOwnBalance = wallet.Kind == "bank" || wallet.Kind == "prepaid" || wallet.Kind == "cash",
        IncludedInTotal = wallet.Kind == "bank" || wallet.Kind == "prepaid" || wallet.Kind == "cash",
        Details = new WalletDetailsDto {
            Kind = wallet.Kind, Currency = wallet.Currency, Institution = wallet.Institution,
            Iban = wallet.Iban, LastFour = wallet.LastFour, Network = wallet.Network, Expiry = wallet.Expiry,
            LinkedAccountId = wallet.LinkedAccountId, CreditLimit = wallet.CreditLimit,
            CurrentSpending = wallet.CurrentSpending, StatementDay = wallet.StatementDay,
            PaymentDay = wallet.PaymentDay, Notes = wallet.Notes,
            Shareable = wallet.Kind == "debit" && wallet.LinkedAccount != null ? wallet.LinkedAccount.Shareable : wallet.Shareable
        }
    };

    public async Task<IReadOnlyList<WalletResponse>> GetWalletsAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.OwnedWallets(database, userId).AsNoTracking().OrderBy(wallet => wallet.Id)
            .Select(WalletProjection()).ToListAsync(cancellationToken);

    public Task<WalletResponse?> GetWalletAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.OwnedWallets(database, userId).AsNoTracking().Where(wallet => wallet.Id == id)
            .Select(WalletProjection()).SingleOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<TransactionTypeResponse>> GetTransactionTypesAsync(UInt64 userId, CancellationToken cancellationToken) =>
        await OwnershipQueryPolicy.AvailableTransactionTypes(database, userId).AsNoTracking()
            .OrderBy(type => type.Id)
            .Select(type => new TransactionTypeResponse(type.Id, type.Name, type.UserId == null) {
            ParentId = type.ParentId, Icon = type.Icon, Color = type.Color, Description = type.Description,
            Keywords = type.Keywords, UseInReports = type.UseInReports,
            SystemKind = type.Id == DatabaseInitializer.TRANSFER.Id ? "Transfer" : type.Id == DatabaseInitializer.ADJUSTMENT.Id ? "Adjustment" : null
        })
            .ToListAsync(cancellationToken);

    public Task<TransactionTypeResponse?> GetTransactionTypeAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.AvailableTransactionTypes(database, userId).AsNoTracking()
            .Where(type => type.Id == id)
            .Select(type => new TransactionTypeResponse(type.Id, type.Name, type.UserId == null) {
            ParentId = type.ParentId, Icon = type.Icon, Color = type.Color, Description = type.Description,
            Keywords = type.Keywords, UseInReports = type.UseInReports,
            SystemKind = type.Id == DatabaseInitializer.TRANSFER.Id ? "Transfer" : type.Id == DatabaseInitializer.ADJUSTMENT.Id ? "Adjustment" : null
        })
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<PageResponse<TransactionResponse>> GetTransactionsAsync(UInt64 userId, TransactionListQuery query, CancellationToken cancellationToken) {
        var offset = (Int64) (query.Page - 1) * query.PageSize;
        if (offset > Int32.MaxValue) {
            throw new logic.Exceptions.ListFilterValidationException("page", "out_of_range");
        }

        var rows = FilterTransactions(userId, query);
        var count = await rows.LongCountAsync(cancellationToken);
        IOrderedQueryable<database.Models.TransactionDb> ordered = query.SortBy switch {
            TransactionOrderBy.Description => query.Direction == SortDirection.Ascending
                ? rows.OrderBy(transaction => transaction.Description)
                : rows.OrderByDescending(transaction => transaction.Description),
            TransactionOrderBy.Value => query.Direction == SortDirection.Ascending
                ? rows.OrderBy(transaction => transaction.Value)
                : rows.OrderByDescending(transaction => transaction.Value),
            TransactionOrderBy.Type => query.Direction == SortDirection.Ascending
                ? rows.OrderBy(transaction => transaction.TransactionType!.Name)
                : rows.OrderByDescending(transaction => transaction.TransactionType!.Name),
            TransactionOrderBy.Wallet => query.Direction == SortDirection.Ascending
                ? rows.OrderBy(transaction => transaction.Wallet!.Name)
                : rows.OrderByDescending(transaction => transaction.Wallet!.Name),
            _ => query.Direction == SortDirection.Ascending
                ? rows.OrderBy(transaction => transaction.Date)
                : rows.OrderByDescending(transaction => transaction.Date)
        };
        var stableOrder = query.Direction == SortDirection.Ascending
            ? ordered.ThenBy(transaction => transaction.Id)
            : ordered.ThenByDescending(transaction => transaction.Id);
        var items = await stableOrder
            .Skip((Int32) offset)
            .Take(query.PageSize)
            .Select(TransactionProjection())
            .ToListAsync(cancellationToken);
        return new PageResponse<TransactionResponse>(query.Page, query.PageSize, count, items);
    }

    public Task<TransactionResponse?> GetTransactionAsync(UInt64 userId, UInt64 id, CancellationToken cancellationToken) =>
        OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.Id == id)
            .Select(TransactionProjection())
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<DashboardResponse> GetDashboardAsync(UInt64 userId, DashboardQuery range, CancellationToken cancellationToken) {
        var from = range.From!.Value;
        var to = range.To!.Value;
        if (from > to) {
            throw new logic.Exceptions.ListFilterValidationException("to", "invalid_date_range");
        }

        var transactions = OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.TransactionDestinationId == null && transaction.Date >= from && transaction.Date <= to);
        var aggregates = await transactions.GroupBy(transaction => new {
            transaction.TransactionTypeId,
            transaction.TransactionType!.Name,
            transaction.TransactionType!.UserId
        })
            .Select(group => new {
                group.Key.TransactionTypeId,
                group.Key.Name,
                IsGlobal = group.Key.UserId == null,
                Incoming = group.Sum(transaction => transaction.Value > 0 ? transaction.Value : 0m),
                Expense = group.Sum(transaction => transaction.Value < 0 ? transaction.Value : 0m),
                Value = group.Sum(transaction => transaction.Value)
            })
            .ToListAsync(cancellationToken);
        var incoming = aggregates.Sum(item => item.Incoming);
        var expense = aggregates.Sum(item => item.Expense);
        var types = (await GetTransactionTypesAsync(userId, cancellationToken)).ToDictionary(type => type.Id);
        var typeValues = aggregates.Select(item => new DashboardCategoryResponse(
            types[item.TransactionTypeId], item.Value)).ToArray();
        return new DashboardResponse(incoming, expense,
            typeValues.Where(item => item.Value > 0).ToArray(),
            typeValues.Where(item => item.Value < 0).ToArray());
    }
    private IQueryable<global::database.Models.TransactionDb> FilterTransactions(UInt64 userId, TransactionFilterQuery query) {
        var rows = OwnershipQueryPolicy.OwnedTransactions(database, userId).AsNoTracking()
            .Where(transaction => transaction.TransactionTypeId != DatabaseInitializer.TRANSFER.Id || transaction.Value < 0);
        if (query.From.HasValue) {
            rows = rows.Where(transaction => transaction.Date >= query.From.Value);
        }

        if (query.To.HasValue) {
            rows = rows.Where(transaction => transaction.Date <= query.To.Value);
        }

        if (query.TypeId.HasValue) {
            rows = rows.Where(transaction => transaction.TransactionTypeId == query.TypeId.Value);
        }

        if (query.WalletId.HasValue) {
            rows = rows.Where(transaction => transaction.WalletId == query.WalletId.Value
            || (transaction.TransactionDestination != null && transaction.TransactionDestination.WalletId == query.WalletId.Value));
        }

        if (!String.IsNullOrWhiteSpace(query.Search)) {
            var search = query.Search.Trim();
            rows = rows.Where(transaction => (transaction.Description != null && transaction.Description.Contains(search))
                || (transaction.LongDescription != null && transaction.LongDescription.Contains(search)));
        }

        rows = query.Kind switch {
            MovementKind.Income => rows.Where(transaction => transaction.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && transaction.Value > 0),
            MovementKind.Expense => rows.Where(transaction => transaction.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && transaction.Value < 0),
            MovementKind.Transfer => rows.Where(transaction => transaction.TransactionTypeId == DatabaseInitializer.TRANSFER.Id),
            _ => rows
        };
        return rows;
    }

}

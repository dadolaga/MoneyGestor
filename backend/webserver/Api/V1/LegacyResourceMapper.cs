using webserver.Models;

namespace webserver.Api.V1;

/// <summary>Adapts versioned resource projections to the frozen legacy JSON contract.</summary>
public static class LegacyResourceMapper {
    public static logic.Models.Color ToLegacy(ColorResponse color, UInt64 userId) => new() {
        Id = color.Id,
        Name = color.Name,
        Value = color.Value,
        UserId = color.IsGlobal ? null : userId
    };

    public static logic.Models.Wallet ToLegacy(WalletResponse wallet, UInt64 userId) => new() {
        Id = wallet.Id,
        Name = wallet.Name,
        Value = wallet.InitialValue,
        CurrentValue = wallet.CurrentValue,
        Favorite = wallet.Favorite,
        Color = ToLegacy(wallet.Color, userId)
    };

    public static logic.Models.Wallet ToLegacy(TransactionWalletResponse wallet, UInt64 userId) => new() {
        Id = wallet.Id,
        Name = wallet.Name,
        Color = ToLegacy(wallet.Color, userId)
    };

    public static logic.Models.TransactionType ToLegacy(TransactionTypeResponse type, UInt64 userId) => new() {
        Id = type.Id,
        Name = type.Name,
        UserId = type.IsGlobal ? null : userId
    };

    public static logic.Models.Transaction ToLegacy(TransactionResponse transaction, UInt64 userId) => new() {
        Id = transaction.Id,
        Description = transaction.Description,
        LongDescription = transaction.LongDescription,
        Date = new DateTimeOffset(transaction.Date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)),
        Value = transaction.Value,
        TransactionType = ToLegacy(transaction.Type, userId),
        Wallet = ToLegacy(transaction.Wallet, userId),
        WalletDestination = transaction.Destination is null ? null : ToLegacy(transaction.Destination, userId),
        User = null,
        UserInsert = null
    };

    public static DashboardOutput ToLegacy(DashboardResponse dashboard, UInt64 userId) => new() {
        Incoming = dashboard.Incoming,
        Expense = dashboard.Expense,
        IncomingCategories = dashboard.IncomingCategories.Select(category => new TransactionTypeValue {
            Type = ToLegacy(category.Type, userId), Value = category.Value
        }).ToArray(),
        ExpenseCategories = dashboard.ExpenseCategories.Select(category => new TransactionTypeValue {
            Type = ToLegacy(category.Type, userId), Value = category.Value
        }).ToArray()
    };
}
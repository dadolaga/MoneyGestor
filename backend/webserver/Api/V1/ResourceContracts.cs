using System.ComponentModel.DataAnnotations;

namespace webserver.Api.V1;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MoneyAmountAttribute : ValidationAttribute {
    public override Boolean IsValid(Object? value) {
        if (value == null) return true;
        if (value is not Decimal amount || Decimal.Abs(amount) > 99999999999999999.99m) return false;
        var scale = (Decimal.GetBits(amount)[3] >> 16) & 0x7F;
        return scale <= 2;
    }
}

public sealed record ColorResponse(UInt64 Id, String? Name, UInt32 Value);
public sealed record WalletResponse(UInt64 Id, String Name, Decimal InitialValue, Decimal CurrentValue, Boolean Favorite, ColorResponse Color);
public sealed record TransactionTypeResponse(UInt64 Id, String Name, Boolean IsGlobal);
public sealed record TransactionWalletResponse(UInt64 Id, String Name, ColorResponse Color);
public sealed record TransactionResponse(
    UInt64 Id,
    String? Description,
    String? LongDescription,
    DateOnly Date,
    Decimal Value,
    TransactionTypeResponse Type,
    TransactionWalletResponse Wallet,
    TransactionWalletResponse? Destination);
public sealed record PageResponse<T>(Int32 Page, Int32 PageSize, Int64 TotalCount, IReadOnlyList<T> Items);
public sealed record DashboardCategoryResponse(TransactionTypeResponse Type, Decimal Value);
public sealed record DashboardResponse(Decimal Incoming, Decimal Expense,
    IReadOnlyList<DashboardCategoryResponse> IncomingCategories,
    IReadOnlyList<DashboardCategoryResponse> ExpenseCategories);

public sealed class DashboardQuery : IValidatableObject {
    [Required] public DateOnly? From { get; init; }
    [Required] public DateOnly? To { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
        if (From.HasValue && To.HasValue && From.Value > To.Value)
            yield return new ValidationResult("invalid_date_range", [nameof(To)]);
    }
}

public sealed record CreateWalletRequest(
    [Required, StringLength(100, MinimumLength = 1)] String Name,
    [MoneyAmount] Decimal InitialValue,
    [Range(1, UInt64.MaxValue)] UInt64 ColorId);

public sealed record UpdateWalletRequest(
    [StringLength(100, MinimumLength = 1)] String? Name,
    [Range(1, UInt64.MaxValue)] UInt64? ColorId);

public sealed record CreateTransactionTypeRequest([Required, StringLength(100, MinimumLength = 1)] String Name);

public sealed record CreateTransactionRequest(
    [StringLength(200)] String? Description,
    [StringLength(2000)] String? LongDescription,
    [Required] DateOnly Date,
    [MoneyAmount] Decimal Value,
    [Range(1, UInt64.MaxValue)] UInt64 TypeId,
    [Range(1, UInt64.MaxValue)] UInt64 WalletId,
    [Range(1, UInt64.MaxValue)] UInt64? DestinationWalletId);

public sealed record UpdateTransactionRequest(
    [StringLength(200)] String? Description,
    [StringLength(2000)] String? LongDescription,
    DateOnly? Date,
    [MoneyAmount] Decimal? Value,
    [Range(1, UInt64.MaxValue)] UInt64? TypeId,
    [Range(1, UInt64.MaxValue)] UInt64? WalletId,
    [Range(1, UInt64.MaxValue)] UInt64? DestinationWalletId);

public sealed class PageQuery {
    [Range(1, Int32.MaxValue)] public Int32 Page { get; init; } = 1;
    [Range(1, 100)] public Int32 PageSize { get; init; } = 50;
}

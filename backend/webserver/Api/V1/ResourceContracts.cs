using System.ComponentModel.DataAnnotations;

namespace webserver.Api.V1;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MoneyAmountAttribute : ValidationAttribute {
    public override Boolean IsValid(Object? value) {
        if (value == null) {
            return true;
        }

        if (value is not Decimal amount || amount > logic.Security.MonetaryValuePolicy.Maximum || amount < -logic.Security.MonetaryValuePolicy.Maximum) {
            return false;
        }

        var scale = (Decimal.GetBits(amount)[3] >> 16) & 0x7F;
        return scale <= 2;
    }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class BusinessDateAttribute : ValidationAttribute {
    public override Boolean IsValid(Object? value) =>
        value == null || (value is DateOnly date && logic.Security.BusinessDatePolicy.IsValid(date));
}

public sealed record ColorResponse(UInt64 Id, String? Name, UInt32 Value) {
    public Boolean IsGlobal { get; init; }
}
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
        if (From.HasValue && To.HasValue && From.Value > To.Value) {
            yield return new ValidationResult("invalid_date_range", [nameof(To)]);
        }
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
    [Required, BusinessDate] DateOnly? Date,
    [MoneyAmount] Decimal Value,
    [Range(1, UInt64.MaxValue)] UInt64 TypeId,
    [Range(1, UInt64.MaxValue)] UInt64 WalletId,
    [Range(1, UInt64.MaxValue)] UInt64? DestinationWalletId);

public sealed class UpdateTransactionRequest {
    private String? description;
    private String? longDescription;

    [StringLength(200)]
    public String? Description {
        get => description;
        init { description = value; DescriptionSpecified = true; }
    }

    [StringLength(2000)]
    public String? LongDescription {
        get => longDescription;
        init { longDescription = value; LongDescriptionSpecified = true; }
    }

    [System.Text.Json.Serialization.JsonIgnore] public Boolean DescriptionSpecified { get; private set; }
    [System.Text.Json.Serialization.JsonIgnore] public Boolean LongDescriptionSpecified { get; private set; }
    [BusinessDate] public DateOnly? Date { get; init; }
    [MoneyAmount] public Decimal? Value { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? TypeId { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? WalletId { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? DestinationWalletId { get; init; }
}

public sealed class PageQuery {
    [Range(1, Int32.MaxValue)] public Int32 Page { get; init; } = 1;
    [Range(1, 100)] public Int32 PageSize { get; init; } = 50;
}

public enum MovementKind { Income, Expense, Transfer }
public enum TransactionOrderBy { Date, Description, Value, Type, Wallet }
public enum SortDirection { Ascending, Descending }

public sealed class TransactionListQuery : IValidatableObject {
    [Range(1, Int32.MaxValue)] public Int32 Page { get; init; } = 1;
    [Range(1, 100)] public Int32 PageSize { get; init; } = 50;
    public DateOnly? From { get; init; }
    public DateOnly? To { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? WalletId { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? TypeId { get; init; }
    [EnumDataType(typeof(MovementKind))] public MovementKind? Kind { get; init; }
    [StringLength(100)] public String? Search { get; init; }
    [EnumDataType(typeof(TransactionOrderBy))] public TransactionOrderBy SortBy { get; init; } = TransactionOrderBy.Date;
    [EnumDataType(typeof(SortDirection))] public SortDirection Direction { get; init; } = SortDirection.Descending;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
        if (From.HasValue && To.HasValue && From.Value > To.Value) {
            yield return new ValidationResult("invalid_date_range", [nameof(To)]);
        }
    }
}
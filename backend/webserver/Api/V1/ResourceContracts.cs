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
public sealed record WalletResponse(UInt64 Id, String Name, Decimal InitialValue, Decimal CurrentValue, Boolean Favorite, ColorResponse Color) {
    public WalletDetailsDto? Details { get; init; }
    public Boolean HasOwnBalance { get; init; } = true;
    public Boolean IncludedInTotal { get; init; } = true;
}

public sealed class WalletDetailsDto {
    [Required, RegularExpression("^(bank|prepaid|debit|credit|cash)$")] public String Kind { get; init; } = String.Empty;
    [Required, RegularExpression("^EUR$")] public String Currency { get; init; } = "EUR";
    [StringLength(100)] public String? Institution { get; init; }
    [StringLength(42)] public String? Iban { get; init; }
    [RegularExpression(@"^\d{4}$")] public String? LastFour { get; init; }
    [RegularExpression("^(visa|mastercard|amex|other)$")] public String? Network { get; init; }
    [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$")] public String? Expiry { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? LinkedAccountId { get; init; }
    [MoneyAmount] public Decimal? CreditLimit { get; init; }
    [MoneyAmount] public Decimal? CurrentSpending { get; init; }
    [Range(1, 31)] public Int32? StatementDay { get; init; }
    [Range(1, 31)] public Int32? PaymentDay { get; init; }
    [StringLength(200)] public String? Notes { get; init; }
    public Boolean Shareable { get; init; }

    public logic.Models.WalletDetails ToModel() => new(Kind, Currency, Institution, Iban, LastFour, Network,
        Expiry, LinkedAccountId, CreditLimit, CurrentSpending, StatementDay, PaymentDay, Notes, Shareable);
}
public sealed record TransactionTypeResponse(UInt64 Id, String Name, Boolean IsGlobal) {
    public UInt64? ParentId { get; init; }
    public String Icon { get; init; } = "tag";
    public String Color { get; init; } = "grey";
    public String? Description { get; init; }
    public String? Keywords { get; init; }
    public Boolean UseInReports { get; init; } = true;
    public String? SystemKind { get; init; }
}
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
    [Range(1, UInt64.MaxValue)] UInt64? ColorId) {
    [Range(0, 16777215)] public UInt32? ColorValue { get; init; }
    public WalletDetailsDto? Details { get; init; }
}

public sealed record UpdateWalletRequest(
    [StringLength(100, MinimumLength = 1)] String? Name,
    [Range(1, UInt64.MaxValue)] UInt64? ColorId) {
    [Range(0, 16777215)] public UInt32? ColorValue { get; init; }
    public WalletDetailsDto? Details { get; init; }
}

public sealed record CreateTransactionTypeRequest([Required, StringLength(100, MinimumLength = 1)] String Name) {
    [Range(1, UInt64.MaxValue)] public UInt64? ParentId { get; init; }
    [Required, RegularExpression("^(shopping|home|transport|food|utilities|work|entertainment|health|tag)$")] public String Icon { get; init; } = "tag";
    [Required, RegularExpression("^(red|orange|yellow|green|cyan|blue|purple|grey)$")] public String Color { get; init; } = "grey";
    [StringLength(500)] public String? Description { get; init; }
    [StringLength(1000)] public String? Keywords { get; init; }
    public Boolean UseInReports { get; init; } = true;
    public logic.Models.TransactionTypeDetails ToModel() => new(ParentId, Icon, Color, Description, Keywords, UseInReports);
}

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

public class TransactionFilterQuery : IValidatableObject {
    [BusinessDate] public virtual DateOnly? From { get; init; }
    [BusinessDate] public virtual DateOnly? To { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? WalletId { get; init; }
    [Range(1, UInt64.MaxValue)] public UInt64? TypeId { get; init; }
    [EnumDataType(typeof(MovementKind))] public MovementKind? Kind { get; init; }
    [StringLength(100)] public String? Search { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
        if (From.HasValue && To.HasValue && From.Value > To.Value) {
            yield return new ValidationResult("invalid_date_range", [nameof(To)]);
        }
    }
}

public sealed class TransactionListQuery : TransactionFilterQuery {
    [Range(1, Int32.MaxValue)] public Int32 Page { get; init; } = 1;
    [Range(1, 100)] public Int32 PageSize { get; init; } = 50;
    [EnumDataType(typeof(TransactionOrderBy))] public TransactionOrderBy SortBy { get; init; } = TransactionOrderBy.Date;
    [EnumDataType(typeof(SortDirection))] public SortDirection Direction { get; init; } = SortDirection.Descending;

}

public class TransactionPeriodQuery : TransactionFilterQuery {
    [Required, BusinessDate] public override DateOnly? From { get; init; }
    [Required, BusinessDate] public override DateOnly? To { get; init; }
}

public sealed class TransactionExportQuery : TransactionPeriodQuery {
    [RegularExpression("^(en|it)$")] public String Locale { get; init; } = "en";
}

public sealed record TransactionPeriod(DateOnly From, DateOnly To);
public sealed record TransactionTotals(Decimal Income, Decimal Expense, Decimal Transfers,
    Int64 IncomeCount, Int64 ExpenseCount, Int64 TransferCount, Int64 MovementCount);
public sealed record TransactionPrevious(TransactionPeriod Period, TransactionTotals Totals);
public sealed record TransactionExpenseCategory(UInt64 TypeId, Decimal Value);
public sealed record TransactionWeekly(DateOnly From, DateOnly To, Decimal Income, Decimal Expense);
public sealed record TransactionDaily(DateOnly Date, Decimal Income, Decimal Expense, Decimal Transfers, Int64 MovementCount);
public sealed record TransactionOverview(TransactionPeriod Period, TransactionTotals Totals, TransactionPrevious Previous,
    IReadOnlyList<TransactionExpenseCategory> ExpenseCategories, IReadOnlyList<TransactionWeekly> Weekly,
    IReadOnlyList<TransactionDaily> Daily);
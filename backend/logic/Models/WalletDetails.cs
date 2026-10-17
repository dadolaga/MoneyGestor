namespace logic.Models;

public sealed record WalletDetails(
    String Kind,
    String Currency,
    String? Institution,
    String? Iban,
    String? LastFour,
    String? Network,
    String? Expiry,
    UInt64? LinkedAccountId,
    Decimal? CreditLimit,
    Decimal? CurrentSpending,
    Int32? StatementDay,
    Int32? PaymentDay,
    String? Notes,
    Boolean Shareable);

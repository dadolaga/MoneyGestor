using database;
using database.Models;
using logic.Exceptions;
using logic.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace logic.Security;

public static partial class WalletConfigurationPolicy {
    public static Boolean HasOwnBalance(String kind) => kind is "bank" or "prepaid" or "cash";

    internal static void RequireOwnBalance(WalletDb wallet) {
        if (!HasOwnBalance(wallet.Kind)) {
            throw new InvalidTransactionException("This card has no independent balance; use a balance-owning wallet");
        }
    }

    internal static async Task<UInt64> ResolveColorAsync(MoneyGestorContext database, UInt64 userId,
        UInt64? colorId, UInt32? colorValue, CancellationToken cancellationToken) {
        if (colorValue.HasValue) {
            if (colorId.HasValue || colorValue > 0xFFFFFF) {
                Fail("color", "invalid_color");
            }

            var color = await OwnershipPolicy.AvailableColors(database, userId)
                .OrderBy(item => item.Id).FirstOrDefaultAsync(item => item.Value == colorValue, cancellationToken);
            if (color == null) {
                color = new ColorDb { Value = colorValue.Value, UserId = userId };
                database.Colors.Add(color);
                await database.SaveChangesAsync(cancellationToken);
            }

            return color.Id;
        }

        if (!colorId.HasValue || colorId == 0) {
            Fail("color", "required");
        }

        await OwnershipPolicy.RequireAvailableColorAsync(database, colorId!.Value, userId, cancellationToken);
        return colorId.Value;
    }

    public static WalletDetails Validate(WalletDetails details) {
        var ownBalance = HasOwnBalance(details.Kind);
        var isCard = details.Kind is "prepaid" or "debit" or "credit";
        var linked = details.Kind is "debit" or "credit";
        if (!ownBalance && !linked) {
            Fail("kind", "invalid_kind");
        }

        if (details.Currency != "EUR") {
            Fail("currency", "invalid_currency");
        }

        if (details.Kind != "cash" && (String.IsNullOrWhiteSpace(details.Institution) || details.Institution.Length > 100)) {
            Fail("institution", "required");
        }

        if (details.Kind == "cash" && !String.IsNullOrEmpty(details.Institution)) {
            Fail("institution", "not_applicable");
        }

        if (details.Notes?.Length > 200) {
            Fail("notes", "too_long");
        }

        if (linked != details.LinkedAccountId.HasValue || details.LinkedAccountId == 0) {
            Fail("linkedAccountId", "invalid_account");
        }

        var iban = String.IsNullOrWhiteSpace(details.Iban) ? null : MyRegex().Replace(details.Iban, "").ToUpperInvariant();
        if (iban != null && (details.Kind is not ("bank" or "prepaid") || !IsValidIban(iban))) {
            Fail("iban", "invalid_iban");
        }

        if (isCard) {
            if (details.Network is not ("visa" or "mastercard" or "amex" or "other")) {
                Fail("network", "invalid_network");
            }

            if (!String.IsNullOrEmpty(details.LastFour) && !Regex.IsMatch(details.LastFour, @"^\d{4}$")) {
                Fail("lastFour", "invalid_last_four");
            }

            if (!String.IsNullOrEmpty(details.Expiry) && !Regex.IsMatch(details.Expiry, @"^\d{4}-(0[1-9]|1[0-2])$")) {
                Fail("expiry", "invalid_expiry");
            }
        } else if (details.Network != null || details.LastFour != null || details.Expiry != null) {
            Fail("kind", "inapplicable_card_fields");
        }

        if (details.Kind == "credit") {
            ValidateCreditAmount(details.CreditLimit, "creditLimit");
            ValidateCreditAmount(details.CurrentSpending, "currentSpending");
            if (details.StatementDay is not (>= 1 and <= 31)) {
                Fail("statementDay", "invalid_day");
            }

            if (details.PaymentDay is not (>= 1 and <= 31)) {
                Fail("paymentDay", "invalid_day");
            }
        } else if (details.CreditLimit != null || details.CurrentSpending != null || details.StatementDay != null || details.PaymentDay != null) {
            Fail("kind", "inapplicable_credit_fields");
        }

        return details with { Institution = details.Institution?.Trim(), Iban = iban, Notes = details.Notes?.Trim() };
    }

    internal static async Task ApplyAsync(MoneyGestorContext database, WalletDb wallet, WalletDetails details,
        UInt64 userId, CancellationToken cancellationToken) {
        if (wallet.Id != 0 && wallet.Kind != details.Kind) {
            Fail("kind", "immutable_kind");
        }

        details = Validate(details);
        if (details.LinkedAccountId.HasValue) {
            if (details.LinkedAccountId == wallet.Id) {
                Fail("linkedAccountId", "invalid_account");
            }

            var account = await OwnershipPolicy.RequireOwnedWalletAsync(database, details.LinkedAccountId.Value, userId, cancellationToken);
            if (account.Kind != "bank") {
                Fail("linkedAccountId", "invalid_account");
            }

            if (details.Kind == "debit") {
                details = details with { Currency = account.Currency, Shareable = account.Shareable };
            }
        }

        wallet.Kind = details.Kind;
        wallet.Currency = details.Currency;
        wallet.Institution = details.Institution;
        wallet.Iban = details.Iban;
        wallet.LastFour = details.LastFour;
        wallet.Network = details.Network;
        wallet.Expiry = details.Expiry;
        wallet.LinkedAccountId = details.LinkedAccountId;
        wallet.CreditLimit = details.CreditLimit;
        wallet.CurrentSpending = details.CurrentSpending;
        wallet.StatementDay = details.StatementDay;
        wallet.PaymentDay = details.PaymentDay;
        wallet.Notes = details.Notes;
        wallet.Shareable = details.Shareable;
    }

    private static void ValidateCreditAmount(Decimal? value, String field) {
        if (!value.HasValue || value < 0) {
            Fail(field, "invalid_amount");
        }

        try { MonetaryValuePolicy.RequireValid(value!.Value); } catch (InvalidTransactionException) { Fail(field, "invalid_amount"); }
    }

    private static Boolean IsValidIban(String iban) {
        if (!Regex.IsMatch(iban, @"^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$")) {
            return false;
        }

        var remainder = 0;
        foreach (var character in iban[4..] + iban[..4]) {
            var value = character <= '9' ? character - '0' : character - 'A' + 10;
            remainder = (remainder * (value < 10 ? 10 : 100) + value) % 97;
        }

        return remainder == 1;
    }

    private static void Fail(String field, String reason) => throw new WalletValidationException(field, reason);
    [GeneratedRegex(@"\s")]
    private static partial Regex MyRegex();
}
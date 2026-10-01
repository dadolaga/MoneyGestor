using logic.Exceptions;

namespace logic.Security;

public static class MonetaryValuePolicy {
    public const Decimal Maximum = 99_999_999_999_999_999.99m;

    public static void RequireValid(Decimal value, Boolean allowZero = true) {
        if (value > Maximum || value < -Maximum || HasMoreThanTwoDecimalPlaces(value) || (!allowZero && value == 0m)) {
            throw new InvalidTransactionException(
                "Monetary values must fit DECIMAL(19,2) and contain at most two decimal places");
        }
    }

    private static Boolean HasMoreThanTwoDecimalPlaces(Decimal value) =>
        ((Decimal.GetBits(value)[3] >> 16) & 0x7F) > 2;
}
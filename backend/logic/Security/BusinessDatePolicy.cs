using logic.Exceptions;

namespace logic.Security;

public static class BusinessDatePolicy {
    public static Boolean IsValid(DateOnly date) => date.Year >= 1000;

    public static void RequireValid(DateOnly date) {
        if (!IsValid(date))
            throw new InvalidTransactionException("Transaction date must fit the MySQL DATE range");
    }
}

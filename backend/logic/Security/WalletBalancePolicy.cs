using database.Models;

namespace logic.Security;

internal static class WalletBalancePolicy {
    internal static void Apply(WalletDb wallet, Decimal difference) {
        checked {
            wallet.CurrentValue += difference;
            wallet.BalanceVersion++;
        }
    }

    internal static void Set(WalletDb wallet, Decimal value) {
        wallet.CurrentValue = value;
        checked {
            wallet.BalanceVersion++;
        }
    }
}

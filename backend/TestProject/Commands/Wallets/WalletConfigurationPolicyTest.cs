using logic.Exceptions;
using logic.Models;
using logic.Security;

namespace TestProject.Commands.Wallets;

public sealed class WalletConfigurationPolicyTest {
    private static WalletDetails Bank() => new("bank", "EUR", "Bank", null, null, null, null,
        null, null, null, null, null, null, false);

    [TestCase("bank", true)]
    [TestCase("prepaid", true)]
    [TestCase("cash", true)]
    [TestCase("debit", false)]
    [TestCase("credit", false)]
    public void OnlyBalanceOwningTypesContributeToWealth(String kind, Boolean expected) => Assert.That(WalletConfigurationPolicy.HasOwnBalance(kind), Is.EqualTo(expected));

    [Test]
    public void DebitRequiresAccountAndCannotCarryCreditFields() {
        var debit = Bank() with { Kind = "debit", Network = "visa" };
        var missingAccount = Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(debit));
        Assert.That(missingAccount!.Field, Is.EqualTo("linkedAccountId"));
        Assert.DoesNotThrow(() => WalletConfigurationPolicy.Validate(debit with { LinkedAccountId = 1 }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(debit with { LinkedAccountId = 1, CreditLimit = 100 }));
    }

    [Test]
    public void CreditRequiresAmountsAndValidClosingAndPaymentDays() {
        var credit = Bank() with {
            Kind = "credit",
            Network = "visa",
            LinkedAccountId = 1,
            CreditLimit = 2000,
            CurrentSpending = 50.25m,
            StatementDay = 28,
            PaymentDay = 15
        };
        Assert.DoesNotThrow(() => WalletConfigurationPolicy.Validate(credit));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(credit with { CreditLimit = -1 }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(credit with { CurrentSpending = 1.001m }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(credit with { StatementDay = 32 }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(credit with { PaymentDay = null }));
    }

    [Test]
    public void IbanIsNormalizedAndChecksumIsValidated() {
        var valid = WalletConfigurationPolicy.Validate(Bank() with { Iban = "it60 x054 2811 1010 0000 0123 456" });
        Assert.That(valid.Iban, Is.EqualTo("IT60X0542811101000000123456"));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(Bank() with { Iban = "IT61X0542811101000000123456" }));
    }

    [Test]
    public void CashAndPrepaidRejectInapplicableAccountLinks() {
        Assert.DoesNotThrow(() => WalletConfigurationPolicy.Validate(Bank() with { Kind = "cash", Institution = null }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(Bank() with { Kind = "cash" }));
        Assert.Throws<WalletValidationException>(() => WalletConfigurationPolicy.Validate(Bank() with { Kind = "prepaid", Network = "visa", LinkedAccountId = 1 }));
    }
}
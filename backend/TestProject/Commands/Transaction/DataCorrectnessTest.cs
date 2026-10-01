using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Commands.Transaction;

[TestFixture]
internal sealed class DataCorrectnessTest : DatabaseBase {
    [TearDown]
    public async Task CleanDatabase() {
        await using var database = TestDatabaseRuntime.CreateContext();
        await database.Transactions.ExecuteDeleteAsync();
        await database.Wallets.ExecuteDeleteAsync();
        await database.TransactionTypes.Where(type => type.UserId != null).ExecuteDeleteAsync();
        await database.Logins.ExecuteDeleteAsync();
        await database.Users.ExecuteDeleteAsync();
    }

    [Test]
    public async Task DecimalArithmeticIsExactAndRejectsExcessScale() {
        var user = new UserSample();
        var executor = await TestUtils.CreateExecutorManagerForUser(user);
        var wallet = new WalletSample(value: 0m);
        var type = new TransactionTypeSample();
        await executor.Execute(wallet.AddWalletCommand);
        await executor.Execute(type.AddTransactionTypeCommand);

        await executor.Execute(new AddTransactionCommand(
            null, null, new DateOnly(2024, 2, 29), wallet.AddWalletCommand.Result, 0.10m,
            type.AddTransactionTypeCommand.Result, null));
        await executor.Execute(new AddTransactionCommand(
            null, null, new DateOnly(2024, 2, 29), wallet.AddWalletCommand.Result, 0.20m,
            type.AddTransactionTypeCommand.Result, null));

        var invalid = new AddTransactionCommand(
            null, null, new DateOnly(2024, 2, 29), wallet.AddWalletCommand.Result, 0.001m,
            type.AddTransactionTypeCommand.Result, null);
        Assert.ThrowsAsync<InvalidTransactionException>(async () => await executor.Execute(invalid));

        await using var database = TestDatabaseRuntime.CreateContext();
        Assert.Multiple(() => {
            Assert.That(database.Transactions.Sum(transaction => transaction.Value), Is.EqualTo(0.30m));
            Assert.That(database.Wallets.Single().CurrentValue, Is.EqualTo(0.30m));
        });
    }

    [Test]
    public void MonetaryRangeUsesDecimal19Scale2Boundaries() {
        Assert.Multiple(() => {
            Assert.DoesNotThrow(() => MonetaryValuePolicy.RequireValid(MonetaryValuePolicy.Maximum));
            Assert.DoesNotThrow(() => MonetaryValuePolicy.RequireValid(-MonetaryValuePolicy.Maximum));
            Assert.Throws<InvalidTransactionException>(() =>
                MonetaryValuePolicy.RequireValid(MonetaryValuePolicy.Maximum + 0.01m));
            Assert.Throws<InvalidTransactionException>(() =>
                MonetaryValuePolicy.RequireValid(Decimal.MinValue));
        });
    }

    [TestCase("2024-02-29")]
    [TestCase("2025-12-31")]
    [TestCase("2026-01-01")]
    public async Task BusinessDateRoundTripsWithoutTimeZone(String value) {
        var expected = DateOnly.ParseExact(value, "yyyy-MM-dd");
        var user = new UserSample();
        var executor = await TestUtils.CreateExecutorManagerForUser(user);
        var wallet = new WalletSample();
        var type = new TransactionTypeSample();
        await executor.Execute(wallet.AddWalletCommand);
        await executor.Execute(type.AddTransactionTypeCommand);
        var command = new AddTransactionCommand(
            null, null, expected, wallet.AddWalletCommand.Result, 1m,
            type.AddTransactionTypeCommand.Result, null);

        await executor.Execute(command);

        await using var database = TestDatabaseRuntime.CreateContext();
        Assert.That(await database.Transactions.Select(transaction => transaction.Date).SingleAsync(),
            Is.EqualTo(expected));
    }

    [Test]
    public async Task ReconciliationReportsDifferenceWithoutRepairingIt() {
        var user = new UserSample();
        var executor = await TestUtils.CreateExecutorManagerForUser(user);
        var wallet = new WalletSample();
        await executor.Execute(wallet.AddWalletCommand);

        await using (var database = TestDatabaseRuntime.CreateContext()) {
            await database.Wallets
                .Where(candidate => candidate.Id == wallet.AddWalletCommand.Result)
                .ExecuteUpdateAsync(update => update.SetProperty(candidate => candidate.CurrentValue, candidate => candidate.CurrentValue + 1m));
        }

        await using var inspectionDatabase = TestDatabaseRuntime.CreateContext();
        var report = await new BalanceReconciliationService(inspectionDatabase).InspectAsync();

        Assert.Multiple(() => {
            Assert.That(report.IsValid, Is.False);
            Assert.That(report.Differences.Single().WalletId, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(report.Differences.Single().Difference, Is.EqualTo(1m));
            Assert.That(inspectionDatabase.Wallets.Single().CurrentValue, Is.EqualTo(wallet.Value + 1m));
        });
    }
}
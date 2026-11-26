using logic;
using logic.Commands.Transaction;
using logic.Commands.User;
using logic.Commands.Wallets;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Commands.Transaction;

[TestFixture]
internal sealed class BalanceConcurrencyTest : DatabaseBase {
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
    public async Task ParallelAddsDoNotLoseBalanceUpdates() {
        var setupDatabase = TestDatabaseRuntime.CreateContext();
        await using var setupDatabaseLease = setupDatabase;
        var setupExecutor = new ExecutorManager(
            setupDatabase,
            TimeProvider.System,
            TestDatabaseRuntime.CreateContext);
        var user = new UserSample();
        var token = await TestUtils.CreateAndLoginUser(setupExecutor, user);
        var wallet = new WalletSample(value: 0m);
        var type = new TransactionTypeSample();
        await setupExecutor.Execute(wallet.AddWalletCommand);
        await setupExecutor.Execute(type.AddTransactionTypeCommand);

        var operations = Enumerable.Range(0, 12).Select(async index => {
            await using var database = TestDatabaseRuntime.CreateContext();
            var executor = new ExecutorManager(
                database,
                TimeProvider.System,
                TestDatabaseRuntime.CreateContext).WithToken(token);
            await executor.Execute(new AddTransactionCommand(
                $"parallel-{index}",
                null,
                new DateOnly(2026, 9, 27),
                wallet.AddWalletCommand.Result,
                0.10m,
                type.AddTransactionTypeCommand.Result,
                null));
        });

        await Task.WhenAll(operations);

        await using var assertionDatabase = TestDatabaseRuntime.CreateContext();
        var storedWallet = await assertionDatabase.Wallets.SingleAsync();
        var transactionCount = await assertionDatabase.Transactions.CountAsync();
        var reconciliation = await new BalanceReconciliationService(assertionDatabase).InspectAsync();
        using (Assert.EnterMultipleScope()) {
            Assert.That(transactionCount, Is.EqualTo(12));
            Assert.That(storedWallet.CurrentValue, Is.EqualTo(1.20m));
            Assert.That(storedWallet.BalanceVersion, Is.EqualTo(12));
            Assert.That(reconciliation.IsValid, Is.True);
        }
    }

    [Test]
    public async Task OppositeTransfersUseStableWalletOrderAndRemainReconciled() {
        await using var setupDatabase = TestDatabaseRuntime.CreateContext();
        var setupExecutor = new ExecutorManager(
            setupDatabase,
            TimeProvider.System,
            TestDatabaseRuntime.CreateContext);
        var user = new UserSample();
        var token = await TestUtils.CreateAndLoginUser(setupExecutor, user);
        var firstWallet = new WalletSample(name: "first", value: 0m);
        var secondWallet = new WalletSample(name: "second", value: 0m);
        await setupExecutor.Execute(firstWallet.AddWalletCommand);
        await setupExecutor.Execute(secondWallet.AddWalletCommand);

        var operations = Enumerable.Range(0, 8).Select(async index => {
            var even = index % 2 == 0;
            await using var database = TestDatabaseRuntime.CreateContext();
            var executor = new ExecutorManager(
                database,
                TimeProvider.System,
                TestDatabaseRuntime.CreateContext).WithToken(token);
            await executor.Execute(new AddTransactionCommand(
                $"opposite-{index}",
                null,
                new DateOnly(2026, 9, 27),
                even ? firstWallet.AddWalletCommand.Result : secondWallet.AddWalletCommand.Result,
                1m,
                DatabaseInitializer.TRANSFER.Id,
                null,
                even ? secondWallet.AddWalletCommand.Result : firstWallet.AddWalletCommand.Result));
        });

        await Task.WhenAll(operations);

        await using var assertionDatabase = TestDatabaseRuntime.CreateContext();
        var wallets = await assertionDatabase.Wallets.OrderBy(wallet => wallet.Id).ToArrayAsync();
        var reconciliation = await new BalanceReconciliationService(assertionDatabase).InspectAsync();
        using (Assert.EnterMultipleScope()) {
            Assert.That(wallets.Select(wallet => wallet.CurrentValue), Is.EqualTo([0m, 0m]));
            Assert.That(assertionDatabase.Transactions.Count(), Is.EqualTo(16));
            Assert.That(reconciliation.IsValid, Is.True);
        }
    }

    [Test]
    public async Task ConcurrentUpdateAndDeleteNeverDoubleApplyBalance() {
        await using var setupDatabase = TestDatabaseRuntime.CreateContext();
        var setupExecutor = new ExecutorManager(
            setupDatabase,
            TimeProvider.System,
            TestDatabaseRuntime.CreateContext);
        var user = new UserSample();
        var token = await TestUtils.CreateAndLoginUser(setupExecutor, user);
        var wallet = new WalletSample(value: 0m);
        var type = new TransactionTypeSample();
        await setupExecutor.Execute(wallet.AddWalletCommand);
        await setupExecutor.Execute(type.AddTransactionTypeCommand);
        var transaction = new AddTransactionCommand(
            null, null, new DateOnly(2026, 9, 27), wallet.AddWalletCommand.Result, 10m,
            type.AddTransactionTypeCommand.Result, null);
        await setupExecutor.Execute(transaction);

        async Task executeIgnoringExpectedConflict(logic.Commands.ICommand<UInt64> command) {
            await using var database = TestDatabaseRuntime.CreateContext();
            var executor = new ExecutorManager(
                database,
                TimeProvider.System,
                TestDatabaseRuntime.CreateContext).WithToken(token);
            try {
                await executor.Execute(command);
            } catch (ObjectNotFoundException) {
                // The competing operation committed first; a bounded whole-use-case retry observes absence.
            }
        }

        await Task.WhenAll(
            executeIgnoringExpectedConflict(new UpdateTransactionCommand(transaction.Result, value: 20m)),
            executeIgnoringExpectedConflict(new DeleteTransactionCommand(transaction.Result)));

        await using var assertionDatabase = TestDatabaseRuntime.CreateContext();
        var storedTransactions = await assertionDatabase.Transactions.ToArrayAsync();
        var storedWallet = await assertionDatabase.Wallets.SingleAsync();
        var reconciliation = await new BalanceReconciliationService(assertionDatabase).InspectAsync();
        using (Assert.EnterMultipleScope()) {
            Assert.That(storedTransactions, Has.Length.LessThanOrEqualTo(1));
            Assert.That(storedWallet.CurrentValue,
                Is.EqualTo(storedTransactions.Length == 0 ? 0m : storedTransactions[0].Value));
            Assert.That(reconciliation.IsValid, Is.True);
        }
    }

    [Test]
    public void RetryIsBoundedWhenEveryAttemptConflicts() {
        var interceptor = new AlwaysConflictInterceptor();
        using var database = TestDatabaseRuntime.CreateContext(interceptor);
        var executor = new ExecutorManager(
            database,
            TimeProvider.System,
            () => TestDatabaseRuntime.CreateContext(interceptor));

        Assert.That(
            async () => await executor.Execute(new AddNewUserCommand(
                "retry", "bounded", "retry-bounded", "retry-bounded@example.test", "Password!123")),
            Throws.InstanceOf<DbUpdateConcurrencyException>());
        Assert.That(interceptor.Attempts, Is.EqualTo(5));
    }

    private sealed class AlwaysConflictInterceptor : SaveChangesInterceptor {
        internal Int32 Attempts { get; private set; }

        public override ValueTask<InterceptionResult<Int32>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<Int32> result,
            CancellationToken cancellationToken = default) {
            Attempts++;
            return ValueTask.FromException<InterceptionResult<Int32>>(
                new DbUpdateConcurrencyException("Injected concurrency conflict."));
        }
    }
}
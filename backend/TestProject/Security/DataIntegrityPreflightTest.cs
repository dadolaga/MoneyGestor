using database.Models;
using logic;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Security;

[TestFixture]
internal sealed class DataIntegrityPreflightTest : DatabaseBase {
    [TearDown]
    public async Task CleanDatabase() {
        using var database = TestDatabaseRuntime.CreateContext();
        await database.Transactions.ExecuteDeleteAsync();
        await database.Wallets.ExecuteDeleteAsync();
        await database.TransactionTypes.Where(type => type.UserId != null).ExecuteDeleteAsync();
        await database.Colors.Where(color => color.UserId != null).ExecuteDeleteAsync();
        await database.Logins.ExecuteDeleteAsync();
        await database.Users.ExecuteDeleteAsync();
    }

    [Test]
    public async Task AcceptsConsistentOwnershipAndTransferPairs() {
        var user = new UserSample();
        var executor = await TestUtils.CreateExecutorManagerForUser(user);
        var sourceWallet = new WalletSample(name: "source");
        var destinationWallet = new WalletSample(name: "destination");
        await executor.Execute(sourceWallet.AddWalletCommand);
        await executor.Execute(destinationWallet.AddWalletCommand);
        var transfer = new TransactionSample(
            DatabaseInitializer.TRANSFER.Id,
            sourceWallet.AddWalletCommand.Result,
            destinationWallet.AddWalletCommand.Result,
            value: 10);
        await executor.Execute(transfer.AddTransactionCommand);

        using var database = TestDatabaseRuntime.CreateContext();
        var report = await DataIntegrityPreflight.InspectAsync(database);

        Assert.That(report.IsValid, Is.True, report.ToSafeSummary());
        Assert.DoesNotThrowAsync(async () => await DataIntegrityPreflight.EnsureValidAsync(database));
    }

    [Test]
    public async Task ReportsBothSidesWhenTransferValuesNoLongerBalance() {
        var user = new UserSample();
        var executor = await TestUtils.CreateExecutorManagerForUser(user);
        var source = new WalletSample(name: "source");
        var destination = new WalletSample(name: "destination");
        await executor.Execute(source.AddWalletCommand);
        await executor.Execute(destination.AddWalletCommand);
        var transfer = new TransactionSample(
            DatabaseInitializer.TRANSFER.Id,
            source.AddWalletCommand.Result,
            destination.AddWalletCommand.Result,
            value: 10);
        await executor.Execute(transfer.AddTransactionCommand);

        await using var database = TestDatabaseRuntime.CreateContext();
        var sourceId = transfer.AddTransactionCommand.Result;
        var destinationId = await database.Transactions
            .Where(row => row.Id == sourceId)
            .Select(row => row.TransactionDestinationId!.Value)
            .SingleAsync();
        await database.Transactions.Where(row => row.Id == destinationId)
            .ExecuteUpdateAsync(update => update.SetProperty(row => row.Value, 11m));

        var report = await DataIntegrityPreflight.InspectAsync(database);
        var transferIssue = report.Issues.Single(issue => issue.Code == "transfer_pair_invariant");
        Assert.That(transferIssue.EntityIds, Is.EquivalentTo(new[] { sourceId, destinationId }));
    }

    [Test]
    public async Task ReportsTechnicalIdsAndDoesNotModifyInconsistentData() {
        var firstUser = new UserSample();
        await TestUtils.CreateExecutorManagerForUser(firstUser);
        var secondUser = new UserSample(username: "second_user", email: "second@test.me");
        await TestUtils.CreateExecutorManagerForUser(secondUser);

        UInt64 mismatchedWalletId;
        UInt64 mismatchedTransactionId;
        UInt64 invalidTransferId;

        using (var database = TestDatabaseRuntime.CreateContext()) {
            var privateColor = new ColorDb {
                Name = "first-user-color",
                Value = 0x112233,
                UserId = firstUser.AddNewUserExecutor.Result
            };
            var secondUserType = new TransactionTypeDb {
                Name = "second-user-type",
                UserId = secondUser.AddNewUserExecutor.Result
            };
            database.AddRange(privateColor, secondUserType);
            await database.SaveChangesAsync();

            var mismatchedWallet = new WalletDb {
                Name = "mismatched-wallet",
                Value = 10,
                CurrentValue = 10,
                ColorId = privateColor.Id,
                UserId = secondUser.AddNewUserExecutor.Result
            };
            var firstUserWallet = new WalletDb {
                Name = "first-user-wallet",
                Value = 20,
                CurrentValue = 20,
                ColorId = DatabaseInitializer.RED.Id,
                UserId = firstUser.AddNewUserExecutor.Result
            };
            database.AddRange(mismatchedWallet, firstUserWallet);
            await database.SaveChangesAsync();

            var mismatchedTransaction = new TransactionDb {
                Description = "must-not-enter-report",
                Date = new DateOnly(2026, 9, 22),
                TransactionTypeId = secondUserType.Id,
                UserId = firstUser.AddNewUserExecutor.Result,
                UserInsertId = secondUser.AddNewUserExecutor.Result,
                WalletId = mismatchedWallet.Id,
                Value = 5
            };
            var invalidTransfer = new TransactionDb {
                Date = new DateOnly(2026, 9, 22),
                TransactionTypeId = DatabaseInitializer.TRANSFER.Id,
                UserId = firstUser.AddNewUserExecutor.Result,
                UserInsertId = firstUser.AddNewUserExecutor.Result,
                WalletId = firstUserWallet.Id,
                Value = -5,
                TransactionDestinationId = null
            };
            database.AddRange(mismatchedTransaction, invalidTransfer);
            await database.SaveChangesAsync();

            mismatchedWalletId = mismatchedWallet.Id;
            mismatchedTransactionId = mismatchedTransaction.Id;
            invalidTransferId = invalidTransfer.Id;
        }

        DataIntegrityReport report;
        using (var database = TestDatabaseRuntime.CreateContext()) {
            report = await DataIntegrityPreflight.InspectAsync(database);
            var exception = Assert.ThrowsAsync<DataIntegrityException>(async () =>
                await DataIntegrityPreflight.EnsureValidAsync(database));
            Assert.That(exception!.Message, Does.Not.Contain("must-not-enter-report"));
        }

        using (Assert.EnterMultipleScope()) {
            Assert.That(report.IsValid, Is.False);
            Assert.That(report.Issues.Single(issue => issue.Code == "wallet_color_owner_mismatch").EntityIds,
                Does.Contain(mismatchedWalletId));
            Assert.That(report.Issues.Single(issue => issue.Code == "transaction_owner_mismatch").EntityIds,
                Does.Contain(mismatchedTransactionId));
            Assert.That(report.Issues.Single(issue => issue.Code == "transaction_wallet_owner_mismatch").EntityIds,
                Does.Contain(mismatchedTransactionId));
            Assert.That(report.Issues.Single(issue => issue.Code == "transaction_type_owner_mismatch").EntityIds,
                Does.Contain(mismatchedTransactionId));
            Assert.That(report.Issues.Single(issue => issue.Code == "transfer_pair_invariant").EntityIds,
                Does.Contain(invalidTransferId));
        }

        using var assertionDatabase = TestDatabaseRuntime.CreateContext();
        using (Assert.EnterMultipleScope()) {
            Assert.That(assertionDatabase.Wallets.Count(), Is.EqualTo(2));
            Assert.That(assertionDatabase.Transactions.Count(), Is.EqualTo(2));
        }
    }
}
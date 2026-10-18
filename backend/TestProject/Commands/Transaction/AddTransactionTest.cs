using logic;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Commands.Transaction {
    internal class AddTransactionTest : ExecutorBase {
        private UserSample user;
        private LoginSample login;
        private WalletSample wallet;
        private TransactionTypeSample transactionType;
        private TransactionSample transaction;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();
            login = new LoginSample(user);
            wallet = new WalletSample();
            transactionType = new TransactionTypeSample();

            await ExecutorManager.Execute(user.AddNewUserExecutor);
            await ExecutorManager.Execute(login.LoginCommand);

            ExecutorManager.SetToken(login.LoginCommand.Result);

            await ExecutorManager.Execute(wallet.AddWalletCommand);
            await ExecutorManager.Execute(transactionType.AddTransactionTypeCommand);

            transaction = new TransactionSample(transactionType.AddTransactionTypeCommand.Result, wallet.AddWalletCommand.Result);
        }

        [TearDown]
        public async Task Teardown() {
            using var db = TestDatabaseRuntime.CreateContext();

            await db.Transactions.ExecuteDeleteAsync();
            await db.Wallets.ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task CorrectInsert_PositiveValue() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(1));

            var transactionDb = db.Transactions.First(t => t.Id == transaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transaction.LongDescription));
            Assert.That(transactionDb.Date, Is.EqualTo(transaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(transaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transaction.WalletId));

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == transaction.WalletId);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));
        }

        [Test]
        public async Task CorrectInsert_NegativeValue() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -21.12m);

            await ExecutorManager.Execute(negativeTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(1));

            var transactionDb = db.Transactions.First(t => t.Id == negativeTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(negativeTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(negativeTransaction.LongDescription));
            Assert.That(transactionDb.Date, Is.EqualTo(negativeTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(negativeTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(negativeTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(negativeTransaction.WalletId));

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == negativeTransaction.WalletId);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + negativeTransaction.Value));
        }

        [Test]
        public async Task InsertWhenWalletGoesNegative() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -(wallet.Value + 10));

            await ExecutorManager.Execute(negativeTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(1));
            Assert.That(
                db.Wallets.Single(wallet => wallet.Id == this.wallet.AddWalletCommand.Result).CurrentValue,
                Is.EqualTo(-10));
        }

        [Test]
        public async Task InsertWhenWalletGoesNegativeWithoutBypass() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -(wallet.Value + 10));

            await ExecutorManager.Execute(negativeTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            var transactionDb = db.Transactions.First(t => t.Id == negativeTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(negativeTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(negativeTransaction.LongDescription));
            Assert.That(transactionDb.Date, Is.EqualTo(negativeTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(negativeTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(negativeTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(negativeTransaction.WalletId));

            var walletDb = (await db.Transactions.Include(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id)).Wallet
                ?? throw new InvalidOperationException("Transaction wallet was not loaded");
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + negativeTransaction.Value));
        }

        [Test]
        public async Task InsertWalletTransfer() {
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(2));

            var transactionDb = db.Transactions.First(t => t.Id == transferTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(transactionDb.Date, Is.EqualTo(transferTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(-transferTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transferTransaction.WalletId));
            Assert.That(transactionDb.TransactionDestinationId, Is.Not.Null);

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == transferTransaction.WalletId);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value - transferTransaction.Value));

            var secondTransactionDb = db.Transactions.First(t => t.Id == transactionDb.TransactionDestinationId);
            using (Assert.EnterMultipleScope()) {
                Assert.That(secondTransactionDb.Description, Is.EqualTo(transferTransaction.Description));
                Assert.That(secondTransactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
                Assert.That(transactionDb.Date, Is.EqualTo(transferTransaction.Date));
                Assert.That(secondTransactionDb.Value, Is.EqualTo(transferTransaction.Value));
                Assert.That(secondTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
                Assert.That(secondTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
                Assert.That(secondTransactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
                Assert.That(secondTransactionDb.WalletId, Is.EqualTo(transferTransaction.WalletDestinationId));
                Assert.That(secondTransactionDb.TransactionDestinationId, Is.EqualTo(transferTransaction.AddTransactionCommand.Result));
            }

            var secondWalletDb = await db.Wallets.FirstAsync(w => w.Id == transferTransaction.WalletDestinationId);
            Assert.That(secondWalletDb.CurrentValue, Is.EqualTo(secondWallet.Value + transferTransaction.Value));
        }

        [Test]
        public async Task InsertWalletTransfer_AllowsNegativeSourceBalance() {
            var secondWallet = new WalletSample(name: "my_second_wallet", value: 4000);
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: wallet.Value + 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(2));
            Assert.That(
                db.Wallets.Single(candidate => candidate.Id == wallet.AddWalletCommand.Result).CurrentValue,
                Is.EqualTo(-10));
        }

        [Test]
        public async Task InsertWalletTransfer_AllowsNegativeBalanceWithoutBypass() {
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: wallet.Value + 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.EqualTo(2));

            var transactionDb = db.Transactions.First(t => t.Id == transferTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(transactionDb.Date, Is.EqualTo(transferTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(-transferTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transferTransaction.WalletId));
            Assert.That(transactionDb.TransactionDestinationId, Is.Not.Null);

            var list = await db.Transactions.Include(t => t.Wallet).ToListAsync();

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == transferTransaction.WalletId);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value - transferTransaction.Value));

            var secondTransactionDb = db.Transactions.First(t => t.Id == transactionDb.TransactionDestinationId);
            using (Assert.EnterMultipleScope()) {
                Assert.That(secondTransactionDb.Description, Is.EqualTo(transferTransaction.Description));
                Assert.That(secondTransactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
                Assert.That(transactionDb.Date, Is.EqualTo(transferTransaction.Date));
                Assert.That(secondTransactionDb.Value, Is.EqualTo(transferTransaction.Value));
                Assert.That(secondTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
                Assert.That(secondTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
                Assert.That(secondTransactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
                Assert.That(secondTransactionDb.WalletId, Is.EqualTo(transferTransaction.WalletDestinationId));
                Assert.That(secondTransactionDb.TransactionDestinationId, Is.EqualTo(transferTransaction.AddTransactionCommand.Result));
            }

            var secondWalletDb = await db.Wallets.FirstAsync(w => w.Id == transferTransaction.WalletDestinationId);
            Assert.That(secondWalletDb.CurrentValue, Is.EqualTo(secondWallet.Value + transferTransaction.Value));
        }

        [Test]
        public async Task InsertWithAnotherUsersWalletIsNotFound() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var negativeTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.ADJUSTMENT.Id,
                walletId: wallet.AddWalletCommand.Result,
                value: wallet.Value + 10);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () =>
                await secondExecutor.Execute(negativeTransaction.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.Zero);
        }

        [Test]
        public async Task TransferWithoutDestinationIsRejectedBeforeMutation() {
            var invalid = new TransactionSample(
                DatabaseInitializer.TRANSFER.Id,
                wallet.AddWalletCommand.Result,
                value: 10);

            Assert.ThrowsAsync<InvalidTransactionException>(async () =>
                await ExecutorManager.Execute(invalid.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count(), Is.Zero);
            Assert.That(db.Wallets.Single(candidate => candidate.Id == wallet.AddWalletCommand.Result).CurrentValue,
                Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task NonTransferWithDestinationIsRejectedBeforeMutation() {
            var secondWallet = new WalletSample(name: "second-wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);
            var invalid = new TransactionSample(
                transactionType.AddTransactionTypeCommand.Result,
                wallet.AddWalletCommand.Result,
                secondWallet.AddWalletCommand.Result,
                value: 10);

            Assert.ThrowsAsync<InvalidTransactionException>(async () =>
                await ExecutorManager.Execute(invalid.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            using (Assert.EnterMultipleScope()) {
                Assert.That(db.Transactions.Count(), Is.Zero);
                Assert.That(db.Wallets.All(candidate => candidate.CurrentValue == candidate.Value), Is.True);
            }
        }

        [Test]
        public async Task TransferToSameWalletIsRejectedBeforeMutation() {
            var invalid = new TransactionSample(
                DatabaseInitializer.TRANSFER.Id,
                wallet.AddWalletCommand.Result,
                wallet.AddWalletCommand.Result,
                value: 10);

            Assert.ThrowsAsync<InvalidTransactionException>(async () =>
                await ExecutorManager.Execute(invalid.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            using (Assert.EnterMultipleScope()) {
                Assert.That(db.Transactions.Count(), Is.Zero);
                Assert.That(db.Wallets.Single().CurrentValue, Is.EqualTo(wallet.Value));
            }
        }

        [TestCase(0)]
        [TestCase(-10)]
        public async Task TransferRequiresPositiveValue(Decimal invalidValue) {
            var secondWallet = new WalletSample(name: "second-wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);
            var invalid = new TransactionSample(
                DatabaseInitializer.TRANSFER.Id,
                wallet.AddWalletCommand.Result,
                secondWallet.AddWalletCommand.Result,
                value: invalidValue);

            Assert.ThrowsAsync<InvalidTransactionException>(async () =>
                await ExecutorManager.Execute(invalid.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            using (Assert.EnterMultipleScope()) {
                Assert.That(db.Transactions.Count(), Is.Zero);
                Assert.That(db.Wallets.All(candidate => candidate.CurrentValue == candidate.Value), Is.True);
            }
        }

        [Test]
        public async Task TransferCannotUseAnotherUsersDestinationWallet() {
            var otherUser = new UserSample(username: "other_user", email: "other@test.me");
            var otherExecutor = await TestUtils.CreateExecutorManagerForUser(otherUser);
            var otherWallet = new WalletSample(name: "other-wallet");
            await otherExecutor.Execute(otherWallet.AddWalletCommand);

            var invalid = new TransactionSample(
                DatabaseInitializer.TRANSFER.Id,
                wallet.AddWalletCommand.Result,
                otherWallet.AddWalletCommand.Result,
                value: 10);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () =>
                await ExecutorManager.Execute(invalid.AddTransactionCommand));

            using var db = TestDatabaseRuntime.CreateContext();
            using (Assert.EnterMultipleScope()) {
                Assert.That(db.Transactions.Count(), Is.Zero);
                Assert.That(db.Wallets.All(candidate => candidate.CurrentValue == candidate.Value), Is.True);
            }
        }
    }
}
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
            using var db = DatabaseFactory.Use();

            await db.Transactions.ExecuteDeleteAsync();
            await db.Wallets.ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task CorrectInsert_PositiveValue() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(1));

            var transactionDb = db.Transactions.First(t => t.Id == transaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(transaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(transaction.UserId));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transaction.WalletId));

            var walletDb = await db.Transactions.Include(t => t.Wallet).Select(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));
        }

        [Test]
        public async Task CorrectInsert_NegativeValue() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -21.12);

            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(1));

            var transactionDb = db.Transactions.First(t => t.Id == transaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(transaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(transaction.UserId));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transaction.WalletId));

            var walletDb = await db.Transactions.Include(t => t.Wallet).Select(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));
        }

        [Test]
        public async Task NotInsertWhenWalletGoNegative() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -(wallet.Value + 10));

            Assert.ThrowsAsync<WalletGoesToNegative>(async () => await ExecutorManager.Execute(negativeTransaction.AddTransactionCommand));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task InsertWhenWalletGoNegativeForced() {
            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: -(wallet.Value + 10),
                forceInsert: true);

            await ExecutorManager.Execute(negativeTransaction.AddTransactionCommand);

            using var db = DatabaseFactory.Use();
            var transactionDb = db.Transactions.First(t => t.Id == negativeTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(negativeTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(negativeTransaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(negativeTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(negativeTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(negativeTransaction.UserId));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(negativeTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(negativeTransaction.WalletId));

            var walletDb = (await db.Transactions.Include(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id)).Wallet;
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

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(2));

            var transactionDb = db.Transactions.First(t => t.Id == transferTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transferTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(-transferTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(transferTransaction.UserId));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transferTransaction.WalletId));
            Assert.That(transactionDb.TransactionDestinationId, Is.Not.Null);

            var walletDb = await db.Transactions.Include(t => t.Wallet).Select(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value - transferTransaction.Value));

            var secondTransactionDb = db.Transactions.First(t => t.Id == transactionDb.TransactionDestinationId);
            Assert.That(secondTransactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(secondTransactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transferTransaction.Date));
            Assert.That(secondTransactionDb.Value, Is.EqualTo(transferTransaction.Value));
            Assert.That(secondTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(secondTransactionDb.UserId, Is.EqualTo(transferTransaction.UserId));
            Assert.That(secondTransactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(secondTransactionDb.WalletId, Is.EqualTo(transferTransaction.WalletDestinationId));
            Assert.That(secondTransactionDb.TransactionDestinationId, Is.EqualTo(transferTransaction.AddTransactionCommand.Result));

            var secondWalletDb = await db.Transactions.Include(t => t.Wallet).Select(t => t.Wallet).FirstAsync(t => t.Id == secondTransactionDb.Id);
            Assert.That(secondWalletDb.CurrentValue, Is.EqualTo(secondWallet.Value + transferTransaction.Value));
        }

        [Test]
        public async Task InsertWalletTransfer_NoMutchMoneyInWallet() {
            var secondWallet = new WalletSample(name: "my_second_wallet", value: 4000);
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: wallet.Value + 10);

            Assert.ThrowsAsync<WalletGoesToNegative>(async () => await ExecutorManager.Execute(transferTransaction.AddTransactionCommand));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task InsertWalletTransfer_NoMutchMoneyInWalletForced() {
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: wallet.Value + 10,
                forceInsert: true);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(2));

            var transactionDb = db.Transactions.First(t => t.Id == transferTransaction.AddTransactionCommand.Result);
            Assert.That(transactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(transactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transferTransaction.Date));
            Assert.That(transactionDb.Value, Is.EqualTo(-transferTransaction.Value));
            Assert.That(transactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(transactionDb.UserId, Is.EqualTo(transferTransaction.UserId));
            Assert.That(transactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(transactionDb.WalletId, Is.EqualTo(transferTransaction.WalletId));
            Assert.That(transactionDb.TransactionDestinationId, Is.Not.Null);

            var list = await db.Transactions.Include(t => t.Wallet).ToListAsync();

            var walletDb = (await db.Transactions.Include(t => t.Wallet).FirstAsync(t => t.Id == transactionDb.Id)).Wallet;
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value - transferTransaction.Value));

            var secondTransactionDb = db.Transactions.First(t => t.Id == transactionDb.TransactionDestinationId);
            Assert.That(secondTransactionDb.Description, Is.EqualTo(transferTransaction.Description));
            Assert.That(secondTransactionDb.LongDescription, Is.EqualTo(transferTransaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(transactionDb.Date), Is.EqualTo(transferTransaction.Date));
            Assert.That(secondTransactionDb.Value, Is.EqualTo(transferTransaction.Value));
            Assert.That(secondTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(secondTransactionDb.UserId, Is.EqualTo(transferTransaction.UserId));
            Assert.That(secondTransactionDb.TransactionTypeId, Is.EqualTo(transferTransaction.TransactionTypeId));
            Assert.That(secondTransactionDb.WalletId, Is.EqualTo(transferTransaction.WalletDestinationId));
            Assert.That(secondTransactionDb.TransactionDestinationId, Is.EqualTo(transferTransaction.AddTransactionCommand.Result));

            var secondWalletDb = (await db.Transactions.Include(t => t.Wallet).FirstAsync(t => t.Id == secondTransactionDb.Id)).Wallet;
            Assert.That(secondWalletDb.CurrentValue, Is.EqualTo(secondWallet.Value + transferTransaction.Value));
        }

        [Test]
        public async Task InsertWalletUserNotHavePermission() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var negativeTransaction = new TransactionSample(
                transactionTypeId: transactionType.AddTransactionTypeCommand.Result,
                walletId: wallet.AddWalletCommand.Result,
                value: wallet.Value + 10,
                forceInsert: true);

            Assert.ThrowsAsync<UserNotHavePermissionExcpetion>(async () => await secondExecutor.Execute(transaction.AddTransactionCommand));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(0));
        }
    }
}

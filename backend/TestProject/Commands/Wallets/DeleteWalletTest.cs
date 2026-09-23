using logic;
using logic.Commands.Wallets;
using logic.Commands.Transaction;
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

namespace TestProject.Commands.Wallets {
    internal class DeleteWalletTest : ExecutorBase {
        private UserSample user;
        private LoginSample login;
        private WalletSample wallet;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();
            login = new LoginSample(user);
            wallet = new WalletSample();

            await ExecutorManager.Execute(user.AddNewUserExecutor);
            await ExecutorManager.Execute(login.LoginCommand);

            ExecutorManager.SetToken(login.LoginCommand.Result);

            await ExecutorManager.Execute(wallet.AddWalletCommand);
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
        public async Task DeleteCorrect() {
            var deleteCommand = new DeleteWalletCommand(wallet.AddWalletCommand.Result);

            await ExecutorManager.Execute(deleteCommand);

            Assert.That(deleteCommand.Result, Is.EqualTo(wallet.AddWalletCommand.Result));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task DeleteWhenTransactionNotEmpty_Throws() {
            var transaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.ADJUSTMENT.Id,
                walletId: wallet.AddWalletCommand.Result,
                value: 1);
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var deleteWallet = new DeleteWalletCommand(wallet.AddWalletCommand.Result);

            Assert.ThrowsAsync<NotValidForDeleteException>(async () => await ExecutorManager.Execute(deleteWallet));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Any(w => w.Id == wallet.AddWalletCommand.Result), Is.True);
            Assert.That(db.Transactions.Any(t => t.Id == transaction.AddTransactionCommand.Result), Is.True);
        }

        [Test]
        public async Task DeleteWalletWhenUserNotHavePermission() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var deleteWallet = new DeleteWalletCommand(wallet.AddWalletCommand.Result);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await secondExecutor.Execute(deleteWallet));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(1));
        }

        [Test]
        public async Task CrossUserDeleteDoesNotRevealWhetherWalletContainsTransactions() {
            var transaction = new TransactionSample(
                DatabaseInitializer.ADJUSTMENT.Id,
                wallet.AddWalletCommand.Result,
                value: 1);
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var otherUser = new UserSample(username: "other_user", email: "other@test.me");
            var otherExecutor = await TestUtils.CreateExecutorManagerForUser(otherUser);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () =>
                await otherExecutor.Execute(new DeleteWalletCommand(wallet.AddWalletCommand.Result)));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Any(candidate => candidate.Id == wallet.AddWalletCommand.Result), Is.True);
            Assert.That(db.Transactions.Any(candidate => candidate.Id == transaction.AddTransactionCommand.Result), Is.True);
        }
    }
}

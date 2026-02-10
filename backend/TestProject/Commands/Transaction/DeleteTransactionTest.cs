using logic;
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

namespace TestProject.Commands.Transaction {
    internal class DeleteTransactionTest : ExecutorBase {
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
        public async Task CorrectDelete() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var deleteCommand = new DeleteTransactionCommand(transaction.AddTransactionCommand.Result);

            await ExecutorManager.Execute(deleteCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(0));
        }

        [Test]
        public async Task CorrectDeleteTransfer() {
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            var deleteCommand = new DeleteTransactionCommand(transferTransaction.AddTransactionCommand.Result);

            await ExecutorManager.Execute(deleteCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(0));
        }

        [Test]
        public async Task DeleteTransactionWhenUserNotHavePermiossion_Throw() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var deleteTransaction = new DeleteTransactionCommand(transaction.AddTransactionCommand.Result);

            Assert.ThrowsAsync<UserNotHavePermissionExcpetion>(async () => await secondExecutor.Execute(deleteTransaction));
        }
    }
}

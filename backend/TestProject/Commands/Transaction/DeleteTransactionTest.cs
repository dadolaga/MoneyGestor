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
            using var db = TestDatabaseRuntime.CreateContext();

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

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count, Is.Zero);
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

            using var db = TestDatabaseRuntime.CreateContext();
            Assert.That(db.Transactions.Count, Is.Zero);
        }

        [Test]
        public async Task DeleteTransactionWhenUserNotHavePermiossion_Throw() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var deleteTransaction = new DeleteTransactionCommand(transaction.AddTransactionCommand.Result);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await secondExecutor.Execute(deleteTransaction));
        }

        [Test]
        public async Task DeleteTransaction_UpdatesWalletCurrentValue() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            using (var db = TestDatabaseRuntime.CreateContext()) {
                var walletAfterTransaction = db.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
                Assert.That(walletAfterTransaction.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));
            }

            var deleteCommand = new DeleteTransactionCommand(transaction.AddTransactionCommand.Result);
            await ExecutorManager.Execute(deleteCommand);

            using var dbAfterDelete = TestDatabaseRuntime.CreateContext();
            var walletAfterDelete = dbAfterDelete.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(walletAfterDelete.CurrentValue, Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task DeleteTransfer_UpdatesWalletCurrentValuesCorrectly() {
            const Decimal transferValue = 50m;
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: secondWallet.AddWalletCommand.Result,
                value: transferValue);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            using (var db = TestDatabaseRuntime.CreateContext()) {
                var sourceWallet = db.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
                var destinationWallet = db.Wallets.First(w => w.Id == secondWallet.AddWalletCommand.Result);

                Assert.That(sourceWallet.CurrentValue, Is.EqualTo(wallet.Value - transferValue));
                Assert.That(destinationWallet.CurrentValue, Is.EqualTo(secondWallet.Value + transferValue));
            }

            var deleteCommand = new DeleteTransactionCommand(transferTransaction.AddTransactionCommand.Result);
            await ExecutorManager.Execute(deleteCommand);

            using var dbAfterDelete = TestDatabaseRuntime.CreateContext();
            var sourceWalletAfterDelete = dbAfterDelete.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
            var destinationWalletAfterDelete = dbAfterDelete.Wallets.First(w => w.Id == secondWallet.AddWalletCommand.Result);

            Assert.That(sourceWalletAfterDelete.CurrentValue, Is.EqualTo(wallet.Value));
            Assert.That(destinationWalletAfterDelete.CurrentValue, Is.EqualTo(secondWallet.Value));
        }

        [Test]
        public async Task DeleteTransferByDestinationSideDeletesTheWholePair() {
            var secondWallet = new WalletSample(name: "my_second_wallet");
            await ExecutorManager.Execute(secondWallet.AddWalletCommand);
            var transfer = new TransactionSample(
                DatabaseInitializer.TRANSFER.Id,
                wallet.AddWalletCommand.Result,
                secondWallet.AddWalletCommand.Result,
                value: 50);
            await ExecutorManager.Execute(transfer.AddTransactionCommand);

            UInt64 destinationTransactionId;
            using (var database = TestDatabaseRuntime.CreateContext()) {
                destinationTransactionId = database.Transactions
                    .Single(candidate => candidate.Id == transfer.AddTransactionCommand.Result)
                    .TransactionDestinationId!.Value;
            }

            await ExecutorManager.Execute(new DeleteTransactionCommand(destinationTransactionId));

            using var assertionDatabase = TestDatabaseRuntime.CreateContext();
            Assert.Multiple(() => {
                Assert.That(assertionDatabase.Transactions.Count(), Is.Zero);
                Assert.That(
                    assertionDatabase.Wallets.Single(candidate => candidate.Id == wallet.AddWalletCommand.Result).CurrentValue,
                    Is.EqualTo(wallet.Value));
                Assert.That(
                    assertionDatabase.Wallets.Single(candidate => candidate.Id == secondWallet.AddWalletCommand.Result).CurrentValue,
                    Is.EqualTo(secondWallet.Value));
            });
        }
    }
}
using database.Models;
using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Crypto.Prng;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;
using TestProject.Samples;

namespace TestProject.Commands.Transaction {
    internal class UpdateTransactionTest : ExecutorBase {
        private UserSample user;
        private LoginSample login;
        private WalletSample wallet;
        private WalletSample walletSecond;
        private TransactionTypeSample transactionType;
        private TransactionTypeSample transactionTypeSecond;
        private TransactionSample transaction;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();
            login = new LoginSample(user);
            wallet = new WalletSample();
            walletSecond = new WalletSample(name: $"{wallet.Name}_second", value: 100);
            transactionType = new TransactionTypeSample();
            transactionTypeSecond = new TransactionTypeSample(name: $"{transactionType.Name}_second");

            await ExecutorManager.Execute(user.AddNewUserExecutor);
            await ExecutorManager.Execute(login.LoginCommand);

            ExecutorManager.SetToken(login.LoginCommand.Result);

            await ExecutorManager.Execute(wallet.AddWalletCommand);
            await ExecutorManager.Execute(walletSecond.AddWalletCommand);
            await ExecutorManager.Execute(transactionType.AddTransactionTypeCommand);
            await ExecutorManager.Execute(transactionTypeSecond.AddTransactionTypeCommand);

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
        public async Task IdNotExist_Throw() {
            var updateCommand = new UpdateTransactionCommand(1);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await ExecutorManager.Execute(updateCommand));

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task CorrectUpdate() {
            var newDescription = $"{transaction.Description}_update";
            var newLongDescription = $"{transaction.LongDescription}_update";
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = transactionTypeSecond.AddTransactionTypeCommand.Result;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newValue = transaction.Value + 1.01;

            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transaction.AddTransactionCommand.Result,
                description: newDescription,
                longDescription: newLongDescription,
                date: newDate,
                walletId: newWallet,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result
                );

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(1));

            var updateTransactionDb = db.Transactions.First();
            Assert.That(updateTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(updateTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(updateTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(updateTransactionDb.Value, Is.EqualTo(newValue));
            Assert.That(updateTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(updateTransactionDb.WalletId, Is.EqualTo(newWallet));

            var oldWalletDb = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(oldWalletDb.CurrentValue, Is.EqualTo(wallet.Value));

            var newWalletDb = await db.Wallets.FirstAsync(w => w.Id == walletSecond.AddWalletCommand.Result);
            Assert.That(newWalletDb.CurrentValue, Is.EqualTo(walletSecond.Value + newValue));
        }

        [Test]
        public async Task CorrectUpdate_AllEmptyNothingUpdated() {
            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(id: transaction.AddTransactionCommand.Result);

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(1));

            var updateTransactionDb = db.Transactions.First();
            Assert.That(updateTransactionDb.Description, Is.EqualTo(transaction.Description));
            Assert.That(updateTransactionDb.LongDescription, Is.EqualTo(transaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(updateTransactionDb.Date), Is.EqualTo(transaction.Date));
            Assert.That(updateTransactionDb.Value, Is.EqualTo(transaction.Value));
            Assert.That(updateTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.TransactionTypeId, Is.EqualTo(transaction.TransactionTypeId));
            Assert.That(updateTransactionDb.WalletId, Is.EqualTo(transaction.WalletId));

            var oldWalletDb = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(oldWalletDb.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));

            var newWalletDb = await db.Wallets.FirstAsync(w => w.Id == walletSecond.AddWalletCommand.Result);
            Assert.That(newWalletDb.CurrentValue, Is.EqualTo(walletSecond.Value));
        }

        [Test]
        public async Task CorrectUpdate_OverwriteNull() {
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = transactionTypeSecond.AddTransactionTypeCommand.Result;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newValue = transaction.Value + 1.01;

            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transaction.AddTransactionCommand.Result,
                description: null,
                longDescription: null,
                date: newDate,
                walletId: newWallet,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result,
                overwriteNull: true
                );

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(1));

            var updateTransactionDb = db.Transactions.First();
            Assert.That(updateTransactionDb.Description, Is.Null);
            Assert.That(updateTransactionDb.LongDescription, Is.Null);
            Assert.That(DateOnly.FromDateTime(updateTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(updateTransactionDb.Value, Is.EqualTo(newValue));
            Assert.That(updateTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(updateTransactionDb.WalletId, Is.EqualTo(newWallet));

            var oldWalletDb = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(oldWalletDb.CurrentValue, Is.EqualTo(wallet.Value));

            var newWalletDb = await db.Wallets.FirstAsync(w => w.Id == walletSecond.AddWalletCommand.Result);
            Assert.That(newWalletDb.CurrentValue, Is.EqualTo(walletSecond.Value + newValue));
        }

        [Test]
        public async Task CorrectUpdate_NotEnoughtMoney_Throw() {
            var newDescription = $"{transaction.Description}_update";
            var newLongDescription = $"{transaction.LongDescription}_update";
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = transactionTypeSecond.AddTransactionTypeCommand.Result;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newValue = -(walletSecond.Value + 10);

            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transaction.AddTransactionCommand.Result,
                description: newDescription,
                longDescription: newLongDescription,
                date: newDate,
                walletId: newWallet,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result
                );

            Assert.ThrowsAsync<WalletGoesToNegative>(async () => await ExecutorManager.Execute(updateCommand));

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(1));

            var updateTransactionDb = db.Transactions.First();
            Assert.That(updateTransactionDb.Description, Is.EqualTo(transaction.Description));
            Assert.That(updateTransactionDb.LongDescription, Is.EqualTo(transaction.LongDescription));
            Assert.That(DateOnly.FromDateTime(updateTransactionDb.Date), Is.EqualTo(transaction.Date));
            Assert.That(updateTransactionDb.Value, Is.EqualTo(transaction.Value));
            Assert.That(updateTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.TransactionTypeId, Is.EqualTo(transaction.TransactionTypeId));
            Assert.That(updateTransactionDb.WalletId, Is.EqualTo(transaction.WalletId));

            var oldWalletDb = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(oldWalletDb.CurrentValue, Is.EqualTo(wallet.Value + transaction.Value));

            var newWalletDb = await db.Wallets.FirstAsync(w => w.Id == walletSecond.AddWalletCommand.Result);
            Assert.That(newWalletDb.CurrentValue, Is.EqualTo(walletSecond.Value));
        }

        [Test]
        public async Task CorrectUpdate_MoveToTransfer() {
            var newDescription = $"{transaction.Description}_update";
            var newLongDescription = $"{transaction.LongDescription}_update";
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = DatabaseInitializer.TRANSFER.Id;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newWalletDestination = wallet.AddWalletCommand.Result;
            var newValue = transaction.Value + 1.01;

            await ExecutorManager.Execute(transaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transaction.AddTransactionCommand.Result,
                description: newDescription,
                longDescription: newLongDescription,
                date: newDate,
                walletId: newWallet,
                walletDestinationId: newWalletDestination,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result
                );

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();

            Assert.That(db.Transactions.Count, Is.EqualTo(2));

            var baseTransactionDb = db.Transactions.First(t => t.Id == transaction.AddTransactionCommand.Result);
            Assert.That(baseTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(baseTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(baseTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(baseTransactionDb.Value, Is.EqualTo(-newValue));
            Assert.That(baseTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(baseTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(baseTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(baseTransactionDb.WalletId, Is.EqualTo(newWallet));
            Assert.That(baseTransactionDb.TransactionDestinationId, Is.Not.Null);

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == newWallet);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(walletSecond.Value - newValue));

            var destinationTransactionDb = db.Transactions.First(t => t.Id == baseTransactionDb.TransactionDestinationId);
            Assert.That(destinationTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(destinationTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(baseTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(destinationTransactionDb.Value, Is.EqualTo(newValue));
            Assert.That(destinationTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(destinationTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(destinationTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(destinationTransactionDb.WalletId, Is.EqualTo(newWalletDestination));
            Assert.That(destinationTransactionDb.TransactionDestinationId, Is.EqualTo(updateCommand.Result));

            var destinationWalletDb = await db.Wallets.FirstAsync(w => w.Id == newWalletDestination);
            Assert.That(destinationWalletDb.CurrentValue, Is.EqualTo(wallet.Value + newValue));
        }

        [Test]
        public async Task CorrectUpdate_MoveFromTransfer() {
            var newDescription = $"{transaction.Description}_update";
            var newLongDescription = $"{transaction.LongDescription}_update";
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = transactionTypeSecond.AddTransactionTypeCommand.Result;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newValue = transaction.Value + 1.01;

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: walletSecond.AddWalletCommand.Result,
                value: 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transferTransaction.AddTransactionCommand.Result,
                description: newDescription,
                longDescription: newLongDescription,
                date: newDate,
                walletId: newWallet,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result,
                overwriteNull: true
                );

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();
            Assert.That(db.Transactions.Count, Is.EqualTo(1));

            var updateTransactionDb = db.Transactions.First();
            Assert.That(updateTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(updateTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(updateTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(updateTransactionDb.Value, Is.EqualTo(newValue));
            Assert.That(updateTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(updateTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(updateTransactionDb.TransactionDestinationId, Is.Null);
            Assert.That(updateTransactionDb.WalletId, Is.EqualTo(newWallet));

            var oldWalletDb = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(oldWalletDb.CurrentValue, Is.EqualTo(wallet.Value));

            var newWalletDb = await db.Wallets.FirstAsync(w => w.Id == walletSecond.AddWalletCommand.Result);
            Assert.That(newWalletDb.CurrentValue, Is.EqualTo(walletSecond.Value + newValue));
        }

        [Test]
        public async Task CorrectUpdate_Transfer() {
            var newDescription = $"{transaction.Description}_update";
            var newLongDescription = $"{transaction.LongDescription}_update";
            var newDate = transaction.Date.AddDays(-1);
            var newTransactionType = DatabaseInitializer.TRANSFER.Id;
            var newWallet = walletSecond.AddWalletCommand.Result;
            var newWalletDestination = wallet.AddWalletCommand.Result;
            var newValue = transaction.Value + 1.01;

            var transferTransaction = new TransactionSample(
                transactionTypeId: DatabaseInitializer.TRANSFER.Id,
                walletId: wallet.AddWalletCommand.Result,
                walletDestinationId: walletSecond.AddWalletCommand.Result,
                value: 10);

            await ExecutorManager.Execute(transferTransaction.AddTransactionCommand);

            var updateCommand = new UpdateTransactionCommand(
                id: transferTransaction.AddTransactionCommand.Result,
                description: newDescription,
                longDescription: newLongDescription,
                date: newDate,
                walletId: newWallet,
                walletDestinationId: newWalletDestination,
                value: newValue,
                transactionTypeId: newTransactionType,
                userId: user.AddNewUserExecutor.Result
                );

            await ExecutorManager.Execute(updateCommand);

            var db = DatabaseFactory.Use();

            Assert.That(db.Transactions.Count, Is.EqualTo(2));

            var baseTransactionDb = db.Transactions.First(t => t.Id == transferTransaction.AddTransactionCommand.Result);
            Assert.That(baseTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(baseTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(baseTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(baseTransactionDb.Value, Is.EqualTo(-newValue));
            Assert.That(baseTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(baseTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(baseTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(baseTransactionDb.WalletId, Is.EqualTo(newWallet));
            Assert.That(baseTransactionDb.TransactionDestinationId, Is.Not.Null);

            var walletDb = await db.Wallets.FirstAsync(w => w.Id == newWallet);
            Assert.That(walletDb.CurrentValue, Is.EqualTo(walletSecond.Value - newValue));

            var destinationTransactionDb = db.Transactions.First(t => t.Id == baseTransactionDb.TransactionDestinationId);
            Assert.That(destinationTransactionDb.Description, Is.EqualTo(newDescription));
            Assert.That(destinationTransactionDb.LongDescription, Is.EqualTo(newLongDescription));
            Assert.That(DateOnly.FromDateTime(baseTransactionDb.Date), Is.EqualTo(newDate));
            Assert.That(destinationTransactionDb.Value, Is.EqualTo(newValue));
            Assert.That(destinationTransactionDb.UserInsertId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(destinationTransactionDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
            Assert.That(destinationTransactionDb.TransactionTypeId, Is.EqualTo(newTransactionType));
            Assert.That(destinationTransactionDb.WalletId, Is.EqualTo(newWalletDestination));
            Assert.That(destinationTransactionDb.TransactionDestinationId, Is.EqualTo(updateCommand.Result));

            var destinationWalletDb = await db.Wallets.FirstAsync(w => w.Id == newWalletDestination);
            Assert.That(destinationWalletDb.CurrentValue, Is.EqualTo(wallet.Value + newValue));
        }
    }
}
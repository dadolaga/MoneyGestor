using logic;
using logic.Commands.Wallets;
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
    internal class UpdateWalletCurrentValueTest : ExecutorBase {
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

            await db.Wallets.ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task CorrectInsert_NewValue() {
            const Double newValue = 302;
            var updateValueCommmand = new UpdateWalletCurrentValueCommand(wallet.AddWalletCommand.Result, newValue, false);

            await ExecutorManager.Execute(updateValueCommmand);

            using var db = DatabaseFactory.Use();
            var walletDb = db.Wallets.First(w => w.Id == updateValueCommmand.Result);
            Assert.That(walletDb.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(walletDb.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletDb.CurrentValue, Is.EqualTo(newValue));
        }

        [Test]
        public async Task CorrectInsert_DifferentValue() {
            const Double valueDifference = 12;
            var updateValueCommmand = new UpdateWalletCurrentValueCommand(wallet.AddWalletCommand.Result, valueDifference, true);

            await ExecutorManager.Execute(updateValueCommmand);

            using var db = DatabaseFactory.Use();
            var walletDb = db.Wallets.First(w => w.Id == updateValueCommmand.Result);
            Assert.That(walletDb.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(walletDb.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + valueDifference));
        }

        [Test]
        public async Task CorrectInsert_NotEnougthMoney() {
            Double valueDifference = -(wallet.Value + 12);
            var updateValueCommmand = new UpdateWalletCurrentValueCommand(wallet.AddWalletCommand.Result, valueDifference, true);

            Assert.ThrowsAsync<WalletGoesToNegative>(async () => await ExecutorManager.Execute(updateValueCommmand));

            using var db = DatabaseFactory.Use();
            var walletDb = db.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(walletDb.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(walletDb.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task CorrectInsert_NotEnougthMoneyForced() {
            Double valueDifference = -(wallet.Value + 12);
            var updateValueCommmand = new UpdateWalletCurrentValueCommand(wallet.AddWalletCommand.Result, valueDifference, true, true);

            await ExecutorManager.Execute(updateValueCommmand);

            using var db = DatabaseFactory.Use();
            var walletDb = db.Wallets.First(w => w.Id == updateValueCommmand.Result);
            Assert.That(walletDb.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(walletDb.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value + valueDifference));
        }

        [Test]
        public async Task CorrectInsert_UserNotHavePermission() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            Double valueDifference = 63;
            var updateValueCommmand = new UpdateWalletCurrentValueCommand(wallet.AddWalletCommand.Result, valueDifference, true);

            Assert.ThrowsAsync<UserNotHavePermissionExcpetion>(async () => await secondExecutor.Execute(updateValueCommmand));

            using var db = DatabaseFactory.Use();
            var walletDb = db.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result);
            Assert.That(walletDb.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(walletDb.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletDb.CurrentValue, Is.EqualTo(wallet.Value));
        }
    }
}

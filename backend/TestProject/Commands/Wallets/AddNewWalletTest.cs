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
    internal class AddNewWalletTest : ExecutorBase {
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
        }

        [TearDown]
        public async Task Teardown() {
            using var db = DatabaseFactory.Use();

            await db.Wallets.ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task UserHaveExiratedToken() {
            Clock.Now = Clock.Now.AddHours(5);

            Assert.ThrowsAsync<TokenExpiatedException>(async () => await ExecutorManager.Execute(wallet.AddWalletCommand));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(0));
        }

        [Test]
        public async Task CorrectInsert() {
            await ExecutorManager.Execute(wallet.AddWalletCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(1));

            var dbWallet = await db.Wallets.FirstAsync();
            Assert.That(dbWallet.Id, Is.EqualTo(wallet.AddWalletCommand.Result));
            Assert.That(dbWallet.Name, Is.EqualTo(wallet.Name));
            Assert.That(dbWallet.Value, Is.EqualTo(wallet.Value));
            Assert.That(dbWallet.ColorId, Is.EqualTo(wallet.ColorId));
        }

        [Test]
        public async Task CorrectInsertNegativeValue() {
            var negativeWallet = new WalletSample(value: -2500);
            await ExecutorManager.Execute(negativeWallet.AddWalletCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(1));

            var dbWallet = await db.Wallets.FirstAsync();
            Assert.That(dbWallet.Id, Is.EqualTo(negativeWallet.AddWalletCommand.Result));
            Assert.That(dbWallet.Name, Is.EqualTo(negativeWallet.Name));
            Assert.That(dbWallet.Value, Is.EqualTo(negativeWallet.Value));
            Assert.That(dbWallet.ColorId, Is.EqualTo(negativeWallet.ColorId));
        }

        [Test]
        public async Task DuplicateWalletForSameUser_Throw() {
            await ExecutorManager.Execute(wallet.AddWalletCommand);

            var addWalletCommand = new AddNewWalletCommand(wallet.Name, 89, 2);
            Assert.ThrowsAsync<DuplicateObjectException>(async () => await ExecutorManager.Execute(addWalletCommand));

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(1));
        }

        [Test]
        public async Task WalletWithSameNameDifferentUser() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondUserExecutor = new ExecutorManager();
            var secondWallet = new WalletSample();

            var secondUserToken = await TestUtils.CreateAndLoginUser(secondUserExecutor, secondUser);

            await ExecutorManager.Execute(wallet.AddWalletCommand);

            await secondUserExecutor.Execute(secondWallet.AddWalletCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(2));
        }
    }
}

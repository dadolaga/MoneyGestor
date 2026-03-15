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
    internal class FavoriteWalletTest : ExecutorBase {
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
        public async Task EffectiveSetFavorite() {
            var favoriteWalletCommand = new FavoriteWalletCommand(walletId: wallet.AddWalletCommand.Result, favorite: true);

            await ExecutorManager.Execute(favoriteWalletCommand);

            using var db = DatabaseFactory.Use();
            var walletUpdated = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);

            Assert.That(walletUpdated.Name, Is.EqualTo(wallet.Name));
            Assert.That(walletUpdated.ColorId, Is.EqualTo(wallet.ColorId));
            Assert.That(walletUpdated.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletUpdated.Favorite, Is.True);
        }

        [Test]
        public async Task DuplicateWalletNameDifferentUser() {
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);
            
            var favoriteWalletCommand = new FavoriteWalletCommand(walletId: wallet.AddWalletCommand.Result, favorite: true);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await secondExecutor.Execute(favoriteWalletCommand));

            using var db = DatabaseFactory.Use();
            var walletUpdated = await db.Wallets.FirstAsync(w => w.Id == wallet.AddWalletCommand.Result);

            Assert.That(walletUpdated.Name, Is.EqualTo(wallet.Name));
            Assert.That(walletUpdated.ColorId, Is.EqualTo(wallet.ColorId));
            Assert.That(walletUpdated.Value, Is.EqualTo(wallet.Value));
            Assert.That(walletUpdated.Favorite, Is.False);
        }
    }
}

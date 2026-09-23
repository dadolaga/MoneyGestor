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
    internal class EditWalletTest : ExecutorBase {
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
            await db.Colors.Where(color => color.UserId != null).ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task EffectiveUpdateName() {
            String newName = $"{wallet.Name}_updated";

            var updateWalletCommand = new EditWalletCommand(walletIdToUpdate: wallet.AddWalletCommand.Result, name: newName);

            await ExecutorManager.Execute(updateWalletCommand);

            using var db = DatabaseFactory.Use();
            var walletUpdated = await db.Wallets.FirstAsync(w => w.Id == updateWalletCommand.Result);

            Assert.That(walletUpdated.Name, Is.EqualTo(newName));
            Assert.That(walletUpdated.ColorId, Is.EqualTo(wallet.ColorId));
            Assert.That(walletUpdated.Value, Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task EffectiveUpdateColor() {
            UInt64 newColorId = DatabaseInitializer.GREEN.Id;
            var updateWalletCommand = new EditWalletCommand(walletIdToUpdate: wallet.AddWalletCommand.Result, colorId: newColorId);

            await ExecutorManager.Execute(updateWalletCommand);

            using var db = DatabaseFactory.Use();
            var walletUpdated = await db.Wallets.FirstAsync(w => w.Id == updateWalletCommand.Result);

            Assert.That(walletUpdated.Name, Is.EqualTo(wallet.Name));
            Assert.That(walletUpdated.ColorId, Is.EqualTo(newColorId));
            Assert.That(walletUpdated.Value, Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task EffectiveUpdateColorPassedTheSameName() {
            UInt64 newColorId = DatabaseInitializer.GREEN.Id;
            var updateWalletCommand = new EditWalletCommand(walletIdToUpdate: wallet.AddWalletCommand.Result, name: wallet.Name, colorId: newColorId);

            await ExecutorManager.Execute(updateWalletCommand);

            using var db = DatabaseFactory.Use();
            var walletUpdated = await db.Wallets.FirstAsync(w => w.Id == updateWalletCommand.Result);

            Assert.That(walletUpdated.Name, Is.EqualTo(wallet.Name));
            Assert.That(walletUpdated.ColorId, Is.EqualTo(newColorId));
            Assert.That(walletUpdated.Value, Is.EqualTo(wallet.Value));
        }

        [Test]
        public async Task DuplicateWalletName() {
            String secondName = "my_second_wallet";
            var addSecondWallet = new WalletSample(name: secondName);

            await ExecutorManager.Execute(addSecondWallet.AddWalletCommand);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(2));

            var updateWalletCommand = new EditWalletCommand(walletIdToUpdate: wallet.AddWalletCommand.Result, name: secondName);

            Assert.ThrowsAsync<DuplicateObjectException>(async () => await ExecutorManager.Execute(updateWalletCommand));
        }

        [Test]
        public async Task DuplicateWalletNameDifferentUser() {
            const String newName = "my_second_wallet";
            var secondUser = new UserSample(username: $"{user.Username}_1", email: $"{user.Email}_1");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var secondWallet = new WalletSample(name: newName);

            await secondExecutor.Execute(secondWallet.AddWalletCommand);

            var updateWallet = new EditWalletCommand(wallet.AddWalletCommand.Result, name: newName);

            await ExecutorManager.Execute(updateWallet);

            using var db = DatabaseFactory.Use();
            Assert.That(db.Wallets.Count, Is.EqualTo(2));
            Assert.That(db.Wallets.First(w => w.Id == wallet.AddWalletCommand.Result).Name, Is.EqualTo(newName));
            Assert.That(db.Wallets.First(w => w.Id == secondWallet.AddWalletCommand.Result).Name, Is.EqualTo(newName));
        }

        [Test]
        public async Task CannotChangeWalletToAnotherUsersPrivateColor() {
            var otherUser = new UserSample(username: "other_user", email: "other@test.me");
            await TestUtils.CreateExecutorManagerForUser(otherUser);

            using (var db = DatabaseFactory.Use()) {
                db.Colors.Add(new database.Models.ColorDb {
                    Id = 1000,
                    Name = "Other private color",
                    Value = 0x654321,
                    UserId = otherUser.AddNewUserExecutor.Result
                });
                await db.SaveChangesAsync();
            }

            var update = new EditWalletCommand(wallet.AddWalletCommand.Result, colorId: 1000);
            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await ExecutorManager.Execute(update));

            using var assertionDb = DatabaseFactory.Use();
            Assert.That(
                assertionDb.Wallets.Single(candidate => candidate.Id == wallet.AddWalletCommand.Result).ColorId,
                Is.EqualTo(wallet.ColorId));
        }
    }
}

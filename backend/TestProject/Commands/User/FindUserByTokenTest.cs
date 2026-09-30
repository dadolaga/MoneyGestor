using logic;
using logic.Commands.User;
using logic.Exceptions;
using logic.Managers;
using logic.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;
using TestProject.Samples;

namespace TestProject.Commands.User {
    [TestFixture]
    internal class FindUserByTokenTest : ExecutorBase {
        private UserSample user;
        private LoginSample login;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();
            login = new LoginSample(user);

            await ExecutorManager.Execute(user.AddNewUserExecutor);
            await ExecutorManager.Execute(login.LoginCommand);
        }

        [TearDown]
        public async Task Teardown() {
            using var db = TestDatabaseRuntime.CreateContext();

            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task FindToken_TokenExistCorrectTime() {
            ExecutorManager.SetToken(login.LoginCommand.Result);

            var findUserCommand = new FindUserByTokenCommand();

            await ExecutorManager.Execute(findUserCommand);

            var userId = findUserCommand.Result;

            Assert.That(userId, Is.EqualTo(user.AddNewUserExecutor.Result));
        }

        [Test]
        public async Task FindToken_TokenNotExistExist() {
            var missingToken = $"{login.LoginCommand.Result}_not_exist";
            ExecutorManager.SetToken(missingToken);

            var findUserCommand = new FindUserByTokenCommand();

            var exception = Assert.ThrowsAsync<ExecutorException>(async () => await ExecutorManager.Execute(findUserCommand));
            Assert.That(exception!.Message, Does.Not.Contain(missingToken));
        }

        [Test]
        public async Task FindToken_TokenExpiated() {
            ExecutorManager.SetToken(login.LoginCommand.Result);

            Clock.Now = Clock.Now.AddMonths(1);

            var findUserCommand = new FindUserByTokenCommand();

            Assert.ThrowsAsync<TokenExpiredException>(async () => await ExecutorManager.Execute(findUserCommand));
        }

        [Test]
        public async Task FindTokenAndUpdate_CheckIfUpdate() {
            ExecutorManager.SetToken(login.LoginCommand.Result);

            var findUserCommand = new FindUserByTokenCommand();

            Clock.Now = Clock.Now.AddMinutes(30);

            await ExecutorManager.Execute(findUserCommand);

            var userId = findUserCommand.Result;

            Assert.That(userId, Is.EqualTo(user.AddNewUserExecutor.Result));

            using var db = TestDatabaseRuntime.CreateContext();
            var loginDb = db.Logins.First(l => l.Token == login.LoginCommand.Result);

            Assert.That(loginDb.Expirated,
                Is.EqualTo(Clock.GetUtcNow().UtcDateTime.AddHours(2)).Within(TimeSpan.FromSeconds(5)));
        }
    }
}

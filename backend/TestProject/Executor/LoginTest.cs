using logic;
using logic.Commands;
using logic.Exceptions;
using logic.Managers;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;
using TestProject.Samples;

namespace TestProject.Executor {
    internal class LoginTest : ExecutorBase {
        private UserSample user;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();

            await ExecutorManager.Execute(user.AddNewUserExecutor);
        }

        [TearDown]
        public async Task Teardown() {
            using var db = DatabaseFactory.Use();

            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task Login_CorrectUsernameAndPassword() {
            var loginCommand = new LoginCommand(user.Username, user.Password);

            await ExecutorManager.Execute(loginCommand);

            using var db = DatabaseFactory.Use();
            var loginNumber = db.Logins.Where(l => l.UserId == user.AddNewUserExecutor.GetResult()).Count();

            Assert.That(loginNumber, Is.EqualTo(1));
        }

        [Test]
        public async Task Login_CorrectEmailAndPassword() {
            var loginCommand = new LoginCommand(user.Email, user.Password);

            await ExecutorManager.Execute(loginCommand);

            using var db = DatabaseFactory.Use();
            var loginNumber = db.Logins.Where(l => l.UserId == user.AddNewUserExecutor.GetResult()).Count();

            Assert.That(loginNumber, Is.EqualTo(1));
        }

        [Test]
        public void Login_UsernameNotExist_Throw() {
            var loginCommand = new LoginCommand($"{user.Username}_not_exist", user.Password);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await ExecutorManager.Execute(loginCommand));

            using var db = DatabaseFactory.Use();
            var loginNumber = db.Logins.Count();

            Assert.That(loginNumber, Is.EqualTo(0));
        }

        [Test]
        public void Login_EmailNotExist_Throw() {
            var loginCommand = new LoginCommand($"{user.Email}_not_exist", user.Password);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await ExecutorManager.Execute(loginCommand));

            using var db = DatabaseFactory.Use();
            var loginNumber = db.Logins.Count();

            Assert.That(loginNumber, Is.EqualTo(0));
        }

        [Test]
        public void Login_PasswordNotCorrect_Throw() {
            var loginCommand = new LoginCommand(user.Email, $"{user.Password}_fake");

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => await ExecutorManager.Execute(loginCommand));

            using var db = DatabaseFactory.Use();
            var loginNumber = db.Logins.Count();

            Assert.That(loginNumber, Is.EqualTo(0));
        }

        [Test]
        public async Task Login_ExpiredCorrectSet() {
            var loginCommand = new LoginCommand(user.Email, user.Password);

            await ExecutorManager.Execute(loginCommand);

            using var db = DatabaseFactory.Use();
            var login = db.Logins.Where(l => l.UserId == user.AddNewUserExecutor.GetResult()).First();

            Assert.That(login.Expirated, Is.EqualTo(Clock.Now.AddHours(2)).Within(TimeSpan.FromSeconds(5)));
        }



        [Test]
        public async Task Login_ExpiredCorrectSetWithRemember() {
            var loginCommand = new LoginCommand(user.Email, user.Password, true);

            await ExecutorManager.Execute(loginCommand);

            using var db = DatabaseFactory.Use();
            var login = db.Logins.Where(l => l.UserId == user.AddNewUserExecutor.GetResult()).First();

            Assert.That(login.Expirated, Is.EqualTo(Clock.Now.AddDays(30)).Within(TimeSpan.FromSeconds(5)));
        }
    }
}

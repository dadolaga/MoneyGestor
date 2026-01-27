using database;
using logic;
using logic.Commands.User;
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

namespace TestProject.Commands.User {
    [TestFixture]
    internal class AddNewUserTest : ExecutorBase {
        [TearDown]
        public void Clear() {
            using var db = DatabaseFactory.Use();

            db.Users.ExecuteDelete();
        }

        [Test]
        public async Task AddNewUser_CreateNewUserAndReturnId() {
            String password = "Password";

            var executor = new AddNewUserCommand(
                firstname: "Test",
                lastname: "Test",
                email: "test@test.me",
                username: "test_test",
                password: password
            );

            await ExecutorManager.Execute(executor);

            Assert.IsNotNull(executor.Result);

            using var db = new MoneyGestorContext();
            var user = db.Users.First(u => u.Id == executor.Result);

            Assert.That(user.Id, Is.EqualTo(executor.Result));
            Assert.That(user.Firstname, Is.EqualTo("Test"));
            Assert.That(user.Lastname, Is.EqualTo("Test"));
            Assert.That(user.Email, Is.EqualTo("test@test.me"));
            Assert.That(user.Username, Is.EqualTo("test_test"));
            Assert.That(user.Password, Is.Not.EqualTo(password), "Password is not crypted");
        }

        [Test]
        public async Task AddNewUser_NullParamThrow() {
            String password = "Password";

            Assert.ThrowsAsync<MandatoryParamException>(async () => {
                var executor = new AddNewUserCommand(
                    firstname: null!,
                    lastname: null!,
                    email: null!,
                    username: null!,
                    password: null!
                );
            });
        }

        [Test]
        public async Task AddNewUser_DuplicateEmailThrow() {
            var userSample = new UserSample();

            await ExecutorManager.Execute(userSample.AddNewUserExecutor);

            var addDuplicateUserExecutor = new AddNewUserCommand(
                firstname: $"{userSample.FirstName}_1",
                lastname: $"{userSample.LastName}_1",
                email: userSample.Email,
                username: $"{userSample.Username}_1",
                password: userSample.Password
            );

            Assert.ThrowsAsync<DuplicateObjectException>(async () => await ExecutorManager.Execute(addDuplicateUserExecutor));

            using var db = new MoneyGestorContext();
            var numberOfUser = db.Users.Count();

            Assert.That(numberOfUser, Is.EqualTo(1));
        }

        [Test]
        public async Task AddNewUser_DuplicateUsernameThrow() {
            var userSample = new UserSample();

            await ExecutorManager.Execute(userSample.AddNewUserExecutor);

            var addDuplicateUserExecutor = new AddNewUserCommand(
                firstname: $"{userSample.FirstName}_1",
                lastname: $"{userSample.LastName}_1",
                email: "unused.email@test.me",
                username: userSample.Username,
                password: userSample.Password
            );

            Assert.ThrowsAsync<DuplicateObjectException>(async () => await ExecutorManager.Execute(addDuplicateUserExecutor));

            using var db = new MoneyGestorContext();
            var numberOfUser = db.Users.Count();

            Assert.That(numberOfUser, Is.EqualTo(1));
        }
    }
}
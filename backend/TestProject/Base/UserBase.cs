using logic;
using logic.Managers;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Base {
    internal class UserBase : DatabaseBase {
        protected const string default_username = "test_test";
        protected const string default_email = "test@test.me";
        protected const string default_password = "password";

        protected UInt64? Id { get; private set; }

        [TearDown]
        public async Task UserDatabaseTeardown() {
            using var database = DatabaseFactory.Use();

            await database.Users.ExecuteDeleteAsync();
            await database.Logins.ExecuteDeleteAsync();
        }

        protected async Task<ulong> CreateUser(string username = default_username, string email = default_email, string password = default_password) {
            var userId = await UserManager.AddNewUser(
                firstname: "Test",
                lastname: "Test",
                username: username,
                email: email,
                password: password);

            Assert.NotNull(userId);

            CheckUserSize(1);

            Id = userId;
            return userId;
        }

        protected async Task<string> LoginUser() {
            if (Id == null)
                Assert.Inconclusive("User not be created");

            var token = await UserManager.Login(default_email, default_password);

            Assert.NotNull(token);

            CheckLogin(Id.Value);

            return token;
        }

        protected void CheckLogin(UInt64 user_id) {
            using var database = DatabaseFactory.Use();

            var login = database.Logins.FirstOrDefault(l => l.UserId == user_id);

            Assert.NotNull(login);
        }

        protected void CheckUserSize(int size) {
            using var database = DatabaseFactory.Use();

            Assert.That(database.Users.Count(), Is.EqualTo(size));
        }
    }
}

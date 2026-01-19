using logic;
using logic.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using logic.Managers;
using logic.Clock;
using TestProject.Base;

namespace TestProject {
    [TestFixture]
    internal class UserTest : UserBase {

        [Test]
        public async Task AddNewUser_CreateNewUserAndReturnId() {
            string password = "Password";

            var resultId = await UserManager.AddNewUser(
                    firstname: "Test",
                    lastname: "Test",
                    email: "test@test.me",
                    username: "test_test",
                    password: password
                );

            Assert.NotNull(resultId);

            CheckUserSize(1);
        }

        [Test]
        public async Task AddNewUser_NullParamThrow() {
            string password = "Password";

            Assert.ThrowsAsync<MandatoryParamException>(async () => {
                await UserManager.AddNewUser(
                    firstname: null!,
                    lastname: null!,
                    email: null!,
                    username: null!,
                    password: null!
                );
            });

            CheckUserIsEmpty();
        }

        [Test]
        public async Task AddNewUser_DuplicateEmailThrow() {
            string email = "test@test.com";

            await CreateUser(email: email);

            Assert.ThrowsAsync<DuplicateObjectException>(async () => {
                await CreateUser(email: email);
            });

            CheckUserSize(1);
        }

        [Test]
        public async Task AddNewUser_CheckIsPasswordIsCrypted() {
            string password = "Password";

            var resultId = await UserManager.AddNewUser(
                    firstname: "Test",
                    lastname: "Test",
                    email: "test@test.me",
                    username: "test_test",
                    password: password
                );

            Assert.NotNull(resultId);

            CheckUserSize(1);

            using (var database = DatabaseFactory.Use()) {
                var user = database.Users.First();

                Assert.IsFalse(password.Equals(user.Password), "Password is not crypted");
            }
        }

        [Test]
        public async Task Login_CorrectUsernameAndPassword() {
            var id = await CreateUser();

            var token = await UserManager.Login(default_username, default_password);

            Assert.NotNull(token);

            CheckLogin(id);
        }

        [Test]
        public async Task Login_CorrectEmailAndPassword() {
            var id = await CreateUser();

            var token = await UserManager.Login(default_email, default_password);

            Assert.NotNull(token);

            CheckLogin(id);
        }

        [Test]
        public async Task Login_UsernameNotExist() {
            var id = await CreateUser(username: $"{default_username}_edit");

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => {
                await UserManager.Login(default_username, default_password);
            });

            CheckNotLogin(id);
        }

        [Test]
        public async Task Login_EmailNotExist() {
            var id = await CreateUser(email: $"{default_email}_edit");

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => {
                await UserManager.Login(default_email, default_password);
            });

            CheckNotLogin(id);
        }

        [Test]
        public async Task Login_PasswordNotCorrect() {
            var id = await CreateUser(password: $"{default_password}_edit");

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => {
                await UserManager.Login(default_email, default_password);
            });

            CheckNotLogin(id);
        }

        [Test]
        public async Task FindToken_TokenExistCorrectTime() {
            var id = await CreateUser();
            var token = await UserManager.Login(default_email, default_password);

            var user_find = await UserManager.FindToken(token);

            Assert.That(user_find.Username, Is.EqualTo(default_username));
            Assert.That(user_find.Email, Is.EqualTo(default_email));
        }

        [Test]
        public async Task FindToken_TokenNotExistExist() {
            var id = await CreateUser();
            var token = await UserManager.Login(default_email, default_password);

            Assert.ThrowsAsync<ObjectNotFoundException>(async () => {
                await UserManager.FindToken($"{token}_not_exist");
            });
        }

        [Test]
        public async Task FindToken_TokenExpiated() {
            var id = await CreateUser();
            var token = await UserManager.Login(default_email, default_password);

            Clock.Now = Clock.Now.AddHours(3);

            Assert.ThrowsAsync<TokenExpiatedException>(async () => {
                await UserManager.FindToken(token);
            });
        }

        [Test]
        public async Task FindTokenAndUpdate_CheckIfUpdate() {
            var id = await CreateUser();
            var token = await UserManager.Login(default_email, default_password);

            Clock.Now = Clock.Now.AddHours(1).AddMinutes(30);

            var user_find = await UserManager.FindTokenAndUpdate(token);

            Assert.NotNull(user_find);

            Clock.Now = Clock.Now.AddHours(1).AddMinutes(30);

            user_find = await UserManager.FindTokenAndUpdate(token);

            Assert.That(user_find.Username, Is.EqualTo(default_username));
            Assert.That(user_find.Email, Is.EqualTo(default_email));
        }

        private void CheckUserIsEmpty() {
            CheckUserSize(0);
        }

        private void CheckNotLogin(UInt64 user_id) {
            using var database = DatabaseFactory.Use();

            var login = database.Logins.FirstOrDefault(l => l.UserId == user_id);

            Assert.Null(login);
        }
    }
}

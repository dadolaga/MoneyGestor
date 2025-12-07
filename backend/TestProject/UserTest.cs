using logic;
using logic.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace TestProject {
    [TestFixture]
    public class UserTest {
        public static async Task<UInt64> CreateAndAddSimpleUser(string email = "test@test.me", string username = "test_test", string password = "password") {
            var resultId = UserManager.AddNewUser(
                   firstname: "Test",
                   lastname: "Test",
                   email: "test@test.me",
                   username: "test_test",
                   password: password
               );

            return await resultId;
        }

        [SetUp]
        public async Task SetUp() {
            DatabaseFactory.InTest();

            using var database = DatabaseFactory.Create();

            await database.Database.EnsureCreatedAsync();
            var result = database.Database.GetDbConnection().State;
        }

        [TearDown]
        public async Task Teardown() {
            using var database = DatabaseFactory.Create();

            await database.Database.EnsureDeletedAsync();
        }

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
        }

        [Test]
        public async Task AddNewUser_DuplicateEmailThrow() {
            string email = "test@test.com";

            await CreateAndAddSimpleUser(email: email);

            Assert.ThrowsAsync<DuplicateObjectException>(async () => {
                await CreateAndAddSimpleUser(email: email);
            });
        }
    }
}

using logic;
using logic.Commands.Transaction;
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

namespace TestProject.Commands.Transaction {
    internal class AddTransactionTypeTest : ExecutorBase {
        private UserSample user;
        private LoginSample login;
        private TransactionTypeSample transactionType;

        [SetUp]
        public async Task Setup() {
            user = new UserSample();
            login = new LoginSample(user);
            transactionType = new TransactionTypeSample();

            await ExecutorManager.Execute(user.AddNewUserExecutor);
            await ExecutorManager.Execute(login.LoginCommand);

            ExecutorManager.SetToken(login.LoginCommand.Result);
        }

        [TearDown]
        public async Task Teardown() {
            using var db = DatabaseFactory.Use();

            await db.TransactionTypes.ExecuteDeleteAsync();
            await db.Logins.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }

        [Test]
        public async Task CorrectInsert() {
            await ExecutorManager.Execute(transactionType.AddTransactionTypeCommand);

            using var db = DatabaseFactory.Use();

            var transactionTypeDb = await db.TransactionTypes.FirstOrDefaultAsync(tt => tt.Id == transactionType.AddTransactionTypeCommand.Result);

            Assert.That(transactionTypeDb, Is.Not.Null);
            Assert.That(transactionTypeDb.Name, Is.EqualTo(transactionType.Name));
            Assert.That(transactionTypeDb.UserId, Is.EqualTo(user.AddNewUserExecutor.Result));
        }

        [Test]
        public async Task DuplicateName_Throw() {
            var secondTransactionType = new AddTransactionTypeCommand(transactionType.Name);

            await ExecutorManager.Execute(transactionType.AddTransactionTypeCommand);

            Assert.ThrowsAsync<DuplicateObjectException>(async () => await ExecutorManager.Execute(secondTransactionType));

            using var db = DatabaseFactory.Use();
            Assert.That(db.TransactionTypes.Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task DuplicateNameForOtherUser() {
            var secondUser = new UserSample(username: "second_test", email: "second@test.ts");
            var secondExecutor = await TestUtils.CreateExecutorManagerForUser(secondUser);

            var secondTransactionType = new AddTransactionTypeCommand(transactionType.Name);

            await ExecutorManager.Execute(transactionType.AddTransactionTypeCommand);

            await secondExecutor.Execute(secondTransactionType);

            using var db = DatabaseFactory.Use();
            Assert.That(db.TransactionTypes.Count(), Is.EqualTo(2));
        }
    }
}

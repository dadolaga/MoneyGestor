using logic;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;

namespace TestProject {
    internal class DatabaseInitializerTest {
        [OneTimeSetUp]
        protected async Task DatabaseSetup() {
            DatabaseFactory.InTest();
            using var database = DatabaseFactory.Create();

            await database.Database.EnsureCreatedAsync();
        }

        [TearDown]
        public async Task Teardown() {
            using var database = DatabaseFactory.Use();

            await database.Colors.ExecuteDeleteAsync();
        }

        [OneTimeTearDown]
        protected async Task DatabaseTeardown() {
            using var database = DatabaseFactory.Use();

            var isDeleted = await database.Database.EnsureDeletedAsync();
            await DatabaseInitializer.Init();

            Assert.That(isDeleted, Is.True);
        }

        [Test]
        public async Task InitializeDatabaseCorrect() {
            await DatabaseInitializer.Init();

            using var database = DatabaseFactory.Use();
            var colorCount = database.Colors.Count();

            Assert.That(colorCount, Is.EqualTo(9));
        }

        [Test]
        public async Task InitializeDatabaseNotInsertIfAlreadyExist() {
            await DatabaseInitializer.Init();
            await DatabaseInitializer.Init();

            using var database = DatabaseFactory.Use();

            Assert.That(database.Colors.Count(), Is.EqualTo(9));
            Assert.That(database.TransactionTypes.Count(), Is.EqualTo(2));
        }
    }
}

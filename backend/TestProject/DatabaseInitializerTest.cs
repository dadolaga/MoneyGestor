using logic;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Base;

namespace TestProject {
    [Category("Integration")]
    internal class DatabaseInitializerTest {
        [TearDown]
        public async Task Teardown() {
            using var database = TestDatabaseRuntime.CreateContext();

            await database.Colors.ExecuteDeleteAsync();
        }

        [Test]
        public async Task InitializeDatabaseCorrect() {
            await InitializeDatabase();

            using var database = TestDatabaseRuntime.CreateContext();
            var colorCount = database.Colors.Count();

            Assert.That(colorCount, Is.EqualTo(9));
        }

        [Test]
        public async Task InitializeDatabaseNotInsertIfAlreadyExist() {
            await InitializeDatabase();
            await InitializeDatabase();

            using var database = TestDatabaseRuntime.CreateContext();

            Assert.That(database.Colors.Count(), Is.EqualTo(9));
            Assert.That(database.TransactionTypes.Count(), Is.EqualTo(2));
        }

        private static async Task InitializeDatabase() {
            await using var database = TestDatabaseRuntime.CreateContext();
            await new DatabaseInitializer(database).InitAsync();
        }
    }
}

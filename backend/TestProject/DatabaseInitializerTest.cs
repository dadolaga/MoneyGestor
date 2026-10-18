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

        [Test]
        public async Task InitializeDatabaseRejectsConflictingGlobalSeedValues() {
            await InitializeDatabase();
            await using (var database = TestDatabaseRuntime.CreateContext()) {
                var red = await database.Colors.SingleAsync(color => color.Id == DatabaseInitializer.RED.Id);
                var transfer = await database.TransactionTypes.SingleAsync(
                    type => type.Id == DatabaseInitializer.TRANSFER.Id);
                red.Name = "Wrong";
                red.Value = 0;
                transfer.Name = "Wrong";
                await database.SaveChangesAsync();
            }

            Assert.ThrowsAsync<InvalidOperationException>(InitializeDatabase);

            await using var verification = TestDatabaseRuntime.CreateContext();
            var unchangedRed = await verification.Colors.SingleAsync(
                color => color.Id == DatabaseInitializer.RED.Id);
            var unchangedTransfer = await verification.TransactionTypes.SingleAsync(
                type => type.Id == DatabaseInitializer.TRANSFER.Id);
            Assert.Multiple(() => {
                Assert.That(unchangedRed.Name, Is.EqualTo("Wrong"));
                Assert.That(unchangedRed.Value, Is.Zero);
                Assert.That(unchangedTransfer.Name, Is.EqualTo("Wrong"));
            });
            unchangedRed.Name = DatabaseInitializer.RED.Name;
            unchangedRed.Value = DatabaseInitializer.RED.Value;
            unchangedTransfer.Name = DatabaseInitializer.TRANSFER.Name;
            await verification.SaveChangesAsync();
        }

        private static async Task InitializeDatabase() {
            await using var database = TestDatabaseRuntime.CreateContext();
            await new DatabaseInitializer(database).InitAsync();
        }
    }
}

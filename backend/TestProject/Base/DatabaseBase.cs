using logic;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Base {
    internal abstract class DatabaseBase : ClockBase {
        [OneTimeSetUp]
        protected async Task DatabaseSetup() {
            DatabaseFactory.InTest();

            using var database = DatabaseFactory.Create();

            await database.Database.EnsureCreatedAsync();
        }

        [OneTimeTearDown]
        protected async Task DatabaseTeardown() {
            using var database = DatabaseFactory.Create();

            await database.Database.EnsureDeletedAsync();
        }
    }
}

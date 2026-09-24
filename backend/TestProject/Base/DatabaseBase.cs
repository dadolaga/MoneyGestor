namespace TestProject.Base {
    [Category("Integration")]
    internal abstract class DatabaseBase : ClockBase {
        [SetUp]
        public async Task EnsureGlobalSeed() {
            await using var database = Infrastructure.TestDatabaseRuntime.CreateContext();
            await new logic.DatabaseInitializer(database).InitAsync();
        }
    }
}

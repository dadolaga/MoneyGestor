namespace TestProject.Base {
    [Category("Integration")]
    internal abstract class DatabaseBase : ClockBase {
        [SetUp]
        public Task EnsureGlobalSeed() => logic.DatabaseInitializer.Init();
    }
}

using TestProject.Infrastructure;

[assembly: LevelOfParallelism(1)]

[SetUpFixture]
public sealed class TestAssemblyFixture {
    [OneTimeSetUp]
    public Task StartTestDatabase() => TestDatabaseRuntime.StartAsync();

    [OneTimeTearDown]
    public Task StopTestDatabase() => TestDatabaseRuntime.StopAsync();
}
using database;
using database.Identity;
using logic;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;
using Testcontainers.MySql;

namespace TestProject.Infrastructure;

internal static class TestDatabaseRuntime {
    private const String Image = "mysql:8.4";
    private const String RunIdLabel = "moneygestor.test.run-id";

    private static MySqlContainer? container;
    private static TestDatabaseLease? lease;
    private static Boolean testMode;
    private static String? currentRunId;
    private static String? currentDatabaseName;
    private static String? currentHost;
    private static UInt16 currentPort;
    private static String? currentContainerId;

    internal static String? RunId => currentRunId;
    internal static String? DatabaseName => currentDatabaseName;
    internal static String? ContainerId => currentContainerId;

    internal static async Task StartAsync() {
        if (container != null) {
            throw new InvalidOperationException("The test database container is already running.");
        }

        var runId = Guid.NewGuid().ToString("N");
        var databaseName = $"{TestDatabaseOwnershipGuard.DatabasePrefix}{runId}";
        var username = $"u{runId[..12]}";
        var password = $"Mg!{Guid.NewGuid():N}";

        var candidate = new MySqlBuilder(Image)
            .WithDatabase(databaseName)
            .WithUsername(username)
            .WithPassword(password)
            .WithLabel(RunIdLabel, runId)
            .Build();

        try {
            await candidate.StartAsync();

            var connection = new MySqlConnectionStringBuilder(candidate.GetConnectionString());
            var port = checked((UInt16)connection.Port);
            var candidateLease = new TestDatabaseLease(
                RunId: runId,
                DatabaseName: databaseName,
                Host: connection.Server,
                Port: port,
                ContainerId: candidate.Id);

            MoneyGestorContext.Initialize(
                host: connection.Server,
                port: port,
                name: databaseName,
                user: username,
                password: password,
                enableDatabaseLogging: false);
            IdentityAccountContext.Initialize(
                databaseHost: connection.Server,
                databasePort: port,
                name: databaseName,
                databaseUser: username,
                databasePassword: password);

            using (var database = DatabaseFactory.Create()) {
                await database.Database.EnsureCreatedAsync();
            }

            var identityOptions = new DbContextOptionsBuilder<IdentityAccountContext>();
            IdentityAccountContext.Configure(identityOptions);
            await using (var identityDatabase = new IdentityAccountContext(identityOptions.Options)) {
                await identityDatabase.Database.MigrateAsync();
            }

            await DatabaseInitializer.Init();

            container = candidate;
            lease = candidateLease;
            testMode = true;
            currentRunId = runId;
            currentDatabaseName = databaseName;
            currentHost = connection.Server;
            currentPort = port;
            currentContainerId = candidate.Id;

            TestContext.Progress.WriteLine(
                $"MySQL test resource started: run={runId}, database={databaseName}, container={candidate.Id}.");
        } catch {
            await candidate.DisposeAsync();
            throw;
        }
    }

    internal static async Task StopAsync() {
        if (container == null || lease == null) {
            return;
        }

        TestDatabaseOwnershipGuard.EnsureOwned(
            lease,
            testMode,
            currentRunId ?? String.Empty,
            currentDatabaseName ?? String.Empty,
            currentHost ?? String.Empty,
            currentPort,
            currentContainerId ?? String.Empty);

        TestContext.Progress.WriteLine(
            $"Removing MySQL test resource: run={lease.RunId}, database={lease.DatabaseName}, container={lease.ContainerId}.");

        await container.DisposeAsync();

        container = null;
        lease = null;
        testMode = false;
        currentRunId = null;
        currentDatabaseName = null;
        currentHost = null;
        currentPort = 0;
        currentContainerId = null;
    }
}

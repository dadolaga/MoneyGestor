using database;
using database.Identity;
using logic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
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
    private static DbContextOptions<MoneyGestorContext>? databaseOptions;
    private static DbContextOptions<IdentityAccountContext>? identityOptions;
    private static String? connectionString;

    internal static String? RunId => currentRunId;
    internal static String? DatabaseName => currentDatabaseName;
    internal static String? ContainerId => currentContainerId;

    internal static MoneyGestorContext CreateContext() => new(
        databaseOptions ?? throw new InvalidOperationException("The test database is not running."));

    internal static MoneyGestorContext CreateContext(params IInterceptor[] interceptors) {
        if (String.IsNullOrWhiteSpace(connectionString)) {
            throw new InvalidOperationException("The test database is not running.");
        }

        return new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(connectionString)
            .AddInterceptors(interceptors)
            .Options);
    }

    internal static MoneyGestorContext CreateIsolatedContext(
        String databaseName,
        params IInterceptor[] interceptors) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            connectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = databaseName
        };
        return new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(connection.ConnectionString)
            .AddInterceptors(interceptors)
            .Options);
    }

    internal static String CreateIsolatedDatabaseName() {
        if (String.IsNullOrWhiteSpace(currentDatabaseName)) {
            throw new InvalidOperationException("The test database is not running.");
        }
        return $"{currentDatabaseName}_db21_{Guid.NewGuid():N}"[..63];
    }

    internal static async Task DropIsolatedDatabaseAsync(String databaseName) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            connectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = String.Empty
        };
        await using var server = new MySqlConnection(connection.ConnectionString);
        await server.OpenAsync();
        await using var command = new MySqlCommand($"DROP DATABASE IF EXISTS `{databaseName}`", server);
        await command.ExecuteNonQueryAsync();
    }

    internal static async Task<Boolean> IsolatedDatabaseExistsAsync(String databaseName) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            connectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = String.Empty
        };
        await using var server = new MySqlConnection(connection.ConnectionString);
        await server.OpenAsync();
        await using var command = new MySqlCommand(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = @name", server);
        command.Parameters.AddWithValue("@name", databaseName);
        return Convert.ToInt32(await command.ExecuteScalarAsync()) == 1;
    }

    internal static IdentityAccountContext CreateIdentityContext() => new(
        identityOptions ?? throw new InvalidOperationException("The test database is not running."));

    internal static IdentityAccountContext CreateIsolatedIdentityContext(String databaseName) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            connectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = databaseName
        };
        return new IdentityAccountContext(new DbContextOptionsBuilder<IdentityAccountContext>()
            .UseMySQL(connection.ConnectionString)
            .Options);
    }

    internal static IReadOnlyDictionary<String, String?> CreateConfiguration() {
        if (lease == null || databaseOptions == null) {
            throw new InvalidOperationException("The test database is not running.");
        }

        var connection = new MySqlConnectionStringBuilder(connectionString);
        return new Dictionary<String, String?> {
            ["database:host"] = connection.Server,
            ["database:port"] = connection.Port.ToString(),
            ["database:name"] = connection.Database,
            ["database:user"] = connection.UserID,
            ["database:password"] = connection.Password,
            ["database:bootstrapMode"] = "Migrate",
            ["log:level"] = "Warning",
            ["log:output:console"] = "true",
            ["security:allowedOrigins:0"] = "http://localhost:3000",
            ["email:port"] = "587",
            ["email:useSsl"] = "true",
            ["email:frontendBaseUrl"] = "http://localhost:3000"
        };
    }

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
            .WithEnvironment("MYSQL_ROOT_PASSWORD", password)
            .WithEnvironment("MYSQL_ROOT_HOST", "%")
            .WithLabel(RunIdLabel, runId)
            .Build();

        try {
            await candidate.StartAsync();

            var connection = new MySqlConnectionStringBuilder(candidate.GetConnectionString());
            var port = checked((UInt16)connection.Port);
            var rootConnection = new MySqlConnectionStringBuilder(connection.ConnectionString) {
                Database = String.Empty,
                UserID = "root",
                Password = password
            };
            await using (var root = new MySqlConnection(rootConnection.ConnectionString)) {
                await root.OpenAsync();
                await using var grant = new MySqlCommand(
                    $"GRANT ALL PRIVILEGES ON *.* TO `{username}`@`%`", root);
                await grant.ExecuteNonQueryAsync();
            }
            var candidateLease = new TestDatabaseLease(
                RunId: runId,
                DatabaseName: databaseName,
                Host: connection.Server,
                Port: port,
                ContainerId: candidate.Id);

            databaseOptions = new DbContextOptionsBuilder<MoneyGestorContext>()
                .UseMySQL(connection.ConnectionString)
                .Options;
            identityOptions = new DbContextOptionsBuilder<IdentityAccountContext>()
                .UseMySQL(connection.ConnectionString)
                .Options;
            connectionString = connection.ConnectionString;

            await using (var database = CreateContext()) {
                await new LegacyDatabaseBootstrapper(database)
                    .BootstrapAsync(DatabaseBootstrapMode.Migrate);
            }

            await using (var identityDatabase = CreateIdentityContext()) {
                await identityDatabase.Database.MigrateAsync();
            }

            await using (var database = CreateContext()) {
                await new DatabaseInitializer(database).InitAsync();
            }

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
        databaseOptions = null;
        identityOptions = null;
        connectionString = null;
    }

    private static void EnsureIsolatedDatabaseName(String databaseName) {
        var requiredPrefix = $"{currentDatabaseName}_db21_";
        if (!testMode || String.IsNullOrWhiteSpace(currentRunId) ||
            String.IsNullOrWhiteSpace(currentDatabaseName) ||
            !databaseName.StartsWith(requiredPrefix, StringComparison.Ordinal) ||
            databaseName.Length > 64) {
            throw new InvalidOperationException("Refusing to operate on an unowned DB-21 test database.");
        }
    }
}

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

    private static MySqlContainer? Container;
    private static TestDatabaseLease? Lease;
    private static Boolean TestMode;
    private static String? CurrentRunId;
    private static String? CurrentDatabaseName;
    private static String? CurrentHost;
    private static UInt16 CurrentPort;
    private static String? CurrentContainerId;
    private static DbContextOptions<MoneyGestorContext>? DatabaseOptions;
    private static DbContextOptions<IdentityAccountContext>? IdentityOptions;
    private static String? ConnectionString;

    internal static String? RunId => CurrentRunId;
    internal static String? DatabaseName => CurrentDatabaseName;
    internal static String? ContainerId => CurrentContainerId;

    internal static MoneyGestorContext CreateContext() => new(
        DatabaseOptions ?? throw new InvalidOperationException("The test database is not running."));

    internal static MoneyGestorContext CreateContext(params IInterceptor[] interceptors) {
        return String.IsNullOrWhiteSpace(ConnectionString)
            ? throw new InvalidOperationException("The test database is not running.")
            : new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(ConnectionString)
            .AddInterceptors(interceptors)
            .Options);
    }

    internal static MoneyGestorContext CreateIsolatedContext(
        String databaseName,
        params IInterceptor[] interceptors) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            ConnectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = databaseName
        };
        return new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(connection.ConnectionString)
            .AddInterceptors(interceptors)
            .Options);
    }

    internal static String CreateIsolatedDatabaseName() {
        return String.IsNullOrWhiteSpace(CurrentDatabaseName)
            ? throw new InvalidOperationException("The test database is not running.")
            : $"{CurrentDatabaseName}_schema_{Guid.NewGuid():N}"[..63];
    }

    internal static async Task DropIsolatedDatabaseAsync(String databaseName) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            ConnectionString ?? throw new InvalidOperationException("The test database is not running.")) {
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
            ConnectionString ?? throw new InvalidOperationException("The test database is not running.")) {
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
        IdentityOptions ?? throw new InvalidOperationException("The test database is not running."));

    internal static IdentityAccountContext CreateIsolatedIdentityContext(String databaseName) {
        EnsureIsolatedDatabaseName(databaseName);
        var connection = new MySqlConnectionStringBuilder(
            ConnectionString ?? throw new InvalidOperationException("The test database is not running.")) {
            Database = databaseName
        };
        return new IdentityAccountContext(new DbContextOptionsBuilder<IdentityAccountContext>()
            .UseMySQL(connection.ConnectionString)
            .Options);
    }

    internal static IReadOnlyDictionary<String, String?> CreateConfiguration() {
        if (Lease == null || DatabaseOptions == null) {
            throw new InvalidOperationException("The test database is not running.");
        }

        var connection = new MySqlConnectionStringBuilder(ConnectionString);
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
        if (Container != null) {
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
            var port = checked((UInt16) connection.Port);
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

            DatabaseOptions = new DbContextOptionsBuilder<MoneyGestorContext>()
                .UseMySQL(connection.ConnectionString)
                .Options;
            IdentityOptions = new DbContextOptionsBuilder<IdentityAccountContext>()
                .UseMySQL(connection.ConnectionString)
                .Options;
            ConnectionString = connection.ConnectionString;

            await using (var database = CreateContext()) {
                await new DatabaseBootstrapper(database)
                    .BootstrapAsync(DatabaseBootstrapMode.Migrate);
            }

            await using (var identityDatabase = CreateIdentityContext()) {
                await identityDatabase.Database.MigrateAsync();
            }

            await using (var database = CreateContext()) {
                await new DatabaseInitializer(database).InitAsync();
            }

            Container = candidate;
            Lease = candidateLease;
            TestMode = true;
            CurrentRunId = runId;
            CurrentDatabaseName = databaseName;
            CurrentHost = connection.Server;
            CurrentPort = port;
            CurrentContainerId = candidate.Id;

            TestContext.Progress.WriteLine(
                $"MySQL test resource started: run={runId}, database={databaseName}, container={candidate.Id}.");
        } catch {
            await candidate.DisposeAsync();
            throw;
        }
    }

    internal static async Task StopAsync() {
        if (Container == null || Lease == null) {
            return;
        }

        TestDatabaseOwnershipGuard.EnsureOwned(
            Lease,
            TestMode,
            CurrentRunId ?? String.Empty,
            CurrentDatabaseName ?? String.Empty,
            CurrentHost ?? String.Empty,
            CurrentPort,
            CurrentContainerId ?? String.Empty);

        TestContext.Progress.WriteLine(
            $"Removing MySQL test resource: run={Lease.RunId}, database={Lease.DatabaseName}, container={Lease.ContainerId}.");

        await Container.DisposeAsync();

        Container = null;
        Lease = null;
        TestMode = false;
        CurrentRunId = null;
        CurrentDatabaseName = null;
        CurrentHost = null;
        CurrentPort = 0;
        CurrentContainerId = null;
        DatabaseOptions = null;
        IdentityOptions = null;
        ConnectionString = null;
    }

    private static void EnsureIsolatedDatabaseName(String databaseName) {
        var requiredPrefix = $"{CurrentDatabaseName}_schema_";
        if (!TestMode || String.IsNullOrWhiteSpace(CurrentRunId) ||
            String.IsNullOrWhiteSpace(CurrentDatabaseName) ||
            !databaseName.StartsWith(requiredPrefix, StringComparison.Ordinal) ||
            databaseName.Length > 64) {
            throw new InvalidOperationException("Refusing to operate on an unowned isolated test database.");
        }
    }
}
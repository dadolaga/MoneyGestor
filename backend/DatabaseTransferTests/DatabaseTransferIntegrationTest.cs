using database;
using database.Identity;
using database.Models;
using ExportImportApplication;
using logic;
using logic.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;
using System.Diagnostics;
using Testcontainers.MySql;
using TestProject.Infrastructure;

namespace DatabaseTransferTests;

[Category("Integration")]
[NonParallelizable]
public sealed class DatabaseTransferIntegrationTest {
    private MySqlContainer container = null!;
    private TestDatabaseLease lease = null!;
    private String connectionString = null!;
    private readonly String runId = Guid.NewGuid().ToString("N");

    [OneTimeSetUp]
    public async Task StartOwnedContainer() {
        var password = $"Mg!{Guid.NewGuid():N}";
        container = new MySqlBuilder("mysql:8.4")
            .WithDatabase($"mg_test_{runId}").WithUsername("mg_transfer_test").WithPassword(password)
            .WithEnvironment("MYSQL_ROOT_PASSWORD", password).WithEnvironment("MYSQL_ROOT_HOST", "%")
            .WithLabel("moneygestor.test.run-id", runId).Build();
        await container.StartAsync();
        var connection = new MySqlConnectionStringBuilder(container.GetConnectionString()) { UserID = "root", Password = password };
        connectionString = connection.ConnectionString;
        lease = new TestDatabaseLease(runId, connection.Database, connection.Server, checked((UInt16) connection.Port), container.Id);
    }

    [OneTimeTearDown]
    public async Task StopOwnedContainer() {
        if (lease == null) { return; }

        var current = new MySqlConnectionStringBuilder(container.GetConnectionString());
        TestDatabaseOwnershipGuard.EnsureOwned(lease, true, runId, current.Database,
            current.Server, checked((UInt16) current.Port), container.Id);
        await container.DisposeAsync();
    }

    [Test]
    public async Task RoundTripPreservesIdentityMetadataPairsPrecisionAndNextIds() {
        await using var source = await CreateEmptyTarget();
        await DatabaseTransfer.InitializeAsync(source);
        var user = new ApplicationIdentityUser {
            Id = 42, Firstname = "Caffè 家族", Lastname = "Family", UserName = "family", NormalizedUserName = "FAMILY",
            Email = "family@example.test", NormalizedEmail = "FAMILY@EXAMPLE.TEST", EmailConfirmed = true,
            SecurityStamp = "stamp", ConcurrencyStamp = "concurrency", LockoutEnabled = true,
            LockoutEnd = new DateTimeOffset(2026, 10, 18, 10, 20, 30, TimeSpan.Zero)
        };
        user.PasswordHash = new PasswordHasher<ApplicationIdentityUser>().HashPassword(user, "FamilyStrong123!");
        source.Users.Add(user);
        source.Roles.Add(new IdentityRole<UInt64> { Id = 3, Name = "Family", NormalizedName = "FAMILY" });
        await source.SaveChangesAsync();
        source.UserRoles.Add(new IdentityUserRole<UInt64> { UserId = 42, RoleId = 3 });
        source.UserClaims.Add(new IdentityUserClaim<UInt64> { Id = 100, UserId = 42, ClaimType = "test", ClaimValue = "quoted\"\r\n,;\\N" });
        source.RoleClaims.Add(new IdentityRoleClaim<UInt64> { Id = 101, RoleId = 3, ClaimType = "role", ClaimValue = "value" });
        source.UserLogins.Add(new IdentityUserLogin<UInt64> { UserId = 42, LoginProvider = "test", ProviderKey = "key", ProviderDisplayName = "" });
        source.UserTokens.Add(new IdentityUserToken<UInt64> { UserId = 42, LoginProvider = "test", Name = "test", Value = "sensitive-test-token" });
        source.TransactionTypes.Add(new TransactionTypeDb { Id = 99, Name = "Parent", UserId = 42 });
        source.TransactionTypes.Add(new TransactionTypeDb { Id = 100, ParentId = 99, Name = "Expense", UserId = 42, UseInReports = false });
        source.Wallets.AddRange(
            new WalletDb { Id = 50, UserId = 42, ColorId = 1, Name = "Source", Value = 100m, CurrentValue = 88.75m, BalanceVersion = 7 },
            new WalletDb { Id = 51, UserId = 42, ColorId = 2, Name = "Target", CurrentValue = 10m },
            new WalletDb { Id = 52, UserId = 42, ColorId = 3, Name = "Debit", Kind = "debit", LinkedAccountId = 50 });
        await source.SaveChangesAsync();
        var date = new DateOnly(2026, 10, 18);
        source.Transactions.AddRange(
            new TransactionDb { Id = 200, WalletId = 50, UserId = 42, UserInsertId = 42, TransactionTypeId = 1, Value = -10m, Date = date },
            new TransactionDb { Id = 201, WalletId = 51, UserId = 42, UserInsertId = 42, TransactionTypeId = 1, Value = 10m, Date = date },
            new TransactionDb { Id = 202, WalletId = 50, UserId = 42, UserInsertId = 42, TransactionTypeId = 100, Value = -1.25m, Date = date, Description = "=note, \"caffè\"\n家族" });
        await source.SaveChangesAsync();
        (await source.Transactions.SingleAsync(row => row.Id == 200)).TransactionDestinationId = 201;
        (await source.Transactions.SingleAsync(row => row.Id == 201)).TransactionDestinationId = 200;
        await source.SaveChangesAsync();

        var archive = TemporaryArchive();
        try {
            await DatabaseTransfer.ExportAsync(source, archive, TimeProvider.System);
            await using var target = await CreateEmptyTarget();
            await DatabaseTransfer.ImportAsync(target, archive);
            await DatabaseSchema.RequireCurrentAsync(target);
            var imported = await target.Users.SingleAsync();
            using (Assert.EnterMultipleScope()) {
                Assert.That(new PasswordHasher<ApplicationIdentityUser>().VerifyHashedPassword(imported, imported.PasswordHash!, "FamilyStrong123!"),
                            Is.EqualTo(PasswordVerificationResult.Success));
                Assert.That(await target.UserTokens.CountAsync(), Is.EqualTo(1));
                Assert.That((await target.TransactionTypes.SingleAsync(row => row.Id == 100)).UseInReports, Is.False);
                Assert.That((await target.Wallets.SingleAsync(row => row.Id == 50)).BalanceVersion, Is.EqualTo(7));
                Assert.That((await target.Transactions.SingleAsync(row => row.Id == 200)).TransactionDestinationId, Is.EqualTo(201));
            }
            target.Transactions.Add(new TransactionDb { WalletId = 50, UserId = 42, UserInsertId = 42, TransactionTypeId = 100, Value = -2m, Date = date });
            await target.SaveChangesAsync();
            Assert.That(await target.Transactions.MaxAsync(row => row.Id), Is.GreaterThan(202));
        } finally { File.Delete(archive); }
    }

    [Test]
    public async Task MissingOlderAndNewerVersionsBlockWithoutCreatingOrUpdatingSchema() {
        await using var database = await CreateEmptyTarget();
        Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseSchema.RequireCurrentAsync(database));
        Assert.That(await TableCount(database), Is.Zero);
        await DatabaseTransfer.InitializeAsync(database);
        Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseTransfer.InitializeAsync(database));
        foreach (var version in new[] { 0, DatabaseSchema.CurrentVersion + 1 }) {
            var metadata = await database.Metadata.SingleAsync();
            metadata.SchemaVersion = version;
            await database.SaveChangesAsync();
            Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseSchema.RequireCurrentAsync(database));
            Assert.That((await database.Metadata.AsNoTracking().SingleAsync()).SchemaVersion, Is.EqualTo(version));
        }
    }

    [Test]
    public async Task CorruptArchiveDoesNotCreateDestinationTablesAndReservedConflictsAreNotRepaired() {
        await using var database = await CreateEmptyTarget();
        var archive = TemporaryArchive();
        try {
            await File.WriteAllTextAsync(archive, "not a zip archive");
            Assert.ThrowsAsync<InvalidDataException>(() => DatabaseTransfer.ImportAsync(database, archive));
            Assert.That(await TableCount(database), Is.Zero);
            await DatabaseTransfer.InitializeAsync(database);
            var red = await database.Colors.SingleAsync(row => row.Id == 1);
            red.Name = "conflict";
            await database.SaveChangesAsync();
            Assert.ThrowsAsync<InvalidOperationException>(() => new DatabaseInitializer(database).InitAsync());
            Assert.That((await database.Colors.AsNoTracking().SingleAsync(row => row.Id == 1)).Name, Is.EqualTo("conflict"));
        } finally { File.Delete(archive); }
    }

    [Test]
    public async Task StartupChecksWorkWithSelectOnlyCredentials() {
        await using var database = await CreateEmptyTarget();
        await DatabaseTransfer.InitializeAsync(database);
        var readOnly = new MySqlConnectionStringBuilder(database.Database.GetConnectionString());
        var userName = $"r{Guid.NewGuid():N}"[..20];
        var password = $"Mg!{Guid.NewGuid():N}";
        await using (var command = database.Database.GetDbConnection().CreateCommand()) {
            command.CommandText = $"CREATE USER '{userName}'@'%' IDENTIFIED BY @password";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@password";
            parameter.Value = password;
            command.Parameters.Add(parameter);
            await command.ExecuteNonQueryAsync();
            command.Parameters.Clear();
            command.CommandText = $"GRANT SELECT ON `{readOnly.Database}`.* TO '{userName}'@'%'";
            await command.ExecuteNonQueryAsync();
        }

        readOnly.UserID = userName;
        readOnly.Password = password;
        await using var verification = new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(readOnly.ConnectionString).Options);
        await DatabaseSchema.RequireCurrentAsync(verification);
        await new DatabaseInitializer(verification).ValidateAsync();
        await DataIntegrityPreflight.EnsureValidAsync(verification);
        Assert.That(await verification.Metadata.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public async Task FailedImportRollsBackRowsAndNeverMarksDestinationReady() {
        await using var source = await CreateEmptyTarget();
        await DatabaseTransfer.InitializeAsync(source);
        var original = TemporaryArchive();
        var conflicting = TemporaryArchive();
        try {
            await DatabaseTransfer.ExportAsync(source, original, TimeProvider.System);
            var snapshot = ArchiveFile.Read(original);
            snapshot.Get<ColorDb>().Single(row => row.Id == 1).Name = "conflict";
            ArchiveFile.Write(conflicting, snapshot, TimeProvider.System);
            await using var target = await CreateEmptyTarget();
            Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseTransfer.ImportAsync(target, conflicting));
            using (Assert.EnterMultipleScope()) {
                Assert.That(await target.Metadata.AsNoTracking().CountAsync(), Is.Zero);
                Assert.That(await target.Colors.AsNoTracking().CountAsync(), Is.Zero);
            }
            Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseSchema.RequireCurrentAsync(target));
            Assert.That((await source.Colors.AsNoTracking().SingleAsync(row => row.Id == 1)).Name, Is.EqualTo("Red"));
            await DatabaseSchema.RequireCurrentAsync(source);
        } finally {
            File.Delete(original);
            File.Delete(conflicting);
        }
    }

    [Test]
    public async Task DeleteCliRequiresConfirmationAndRemovesOnlyTheSelectedDatabase() {
        await using var original = await CreateEmptyTarget();
        await DatabaseTransfer.InitializeAsync(original);
        await using var target = await CreateEmptyTarget();
        await DatabaseTransfer.InitializeAsync(target);
        var targetConnection = target.Database.GetConnectionString()!;
        var name = target.Database.GetDbConnection().Database;
        if (!name.StartsWith($"mg_test_{runId}_", StringComparison.Ordinal)) {
            throw new InvalidOperationException("Refusing to delete an unowned test database.");
        }

        await target.Database.CloseConnectionAsync();

        Assert.That(await RunDeleteCli(targetConnection, name, "wrong-name"), Is.EqualTo(1));
        await DatabaseSchema.RequireCurrentAsync(target);
        Assert.That(await RunDeleteCli(targetConnection, name, name), Is.Zero);
        await using (var command = original.Database.GetDbConnection().CreateCommand()) {
            command.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = @name";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@name";
            parameter.Value = name;
            command.Parameters.Add(parameter);
            Assert.That(Convert.ToInt32(await command.ExecuteScalarAsync()), Is.Zero);
        }

        await DatabaseSchema.RequireCurrentAsync(original);
        Assert.That(await original.Colors.CountAsync(), Is.EqualTo(9));
    }

    private static async Task<Int32> RunDeleteCli(String connection, String name, String confirmation) {
        var start = new ProcessStartInfo("dotnet") {
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false
        };
        start.ArgumentList.Add(typeof(DatabaseTransfer).Assembly.Location);
        start.ArgumentList.Add("delete");
        start.ArgumentList.Add("--database");
        start.ArgumentList.Add(name);
        start.Environment["MONEYGESTOR_ADMIN_CONNECTION_STRING"] = connection;
        using var process = Process.Start(start) ?? throw new InvalidOperationException("Could not start the test CLI.");
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        await process.StandardInput.WriteLineAsync(confirmation);
        process.StandardInput.Close();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try {
            await process.WaitForExitAsync(timeout.Token);
        } catch (OperationCanceledException) {
            process.Kill(entireProcessTree: true);
            throw;
        }

        await Task.WhenAll(stdout, stderr);
        return process.ExitCode;
    }

    private async Task<MoneyGestorContext> CreateEmptyTarget() {
        var name = $"mg_test_{runId}_{Guid.NewGuid():N}"[..63];
        if (!name.StartsWith($"mg_test_{runId}_", StringComparison.Ordinal)) {
            throw new InvalidOperationException("Unowned test database target.");
        }

        var connection = new MySqlConnectionStringBuilder(connectionString) { Database = String.Empty };
        await using var server = new MySqlConnection(connection.ConnectionString);
        await server.OpenAsync();
        await using var command = new MySqlCommand($"CREATE DATABASE `{name}`", server);
        await command.ExecuteNonQueryAsync();
        connection.Database = name;
        return new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>().UseMySQL(connection.ConnectionString).Options);
    }

    private static async Task<Int64> TableCount(MoneyGestorContext database) {
        await database.Database.OpenConnectionAsync();
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()";
        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }

    private static String TemporaryArchive() => Path.Combine(Path.GetTempPath(), $"mg-transfer-{Guid.NewGuid():N}.zip");
}
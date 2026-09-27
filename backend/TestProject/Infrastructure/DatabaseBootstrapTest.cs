using database;
using database.Models;
using logic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace TestProject.Infrastructure;

[Category("Integration")]
internal sealed class DatabaseBootstrapTest {
    private readonly List<String> databases = [];

    [Test]
    public void DatabaseOptionsRejectInvalidBootstrapMode() {
        var options = new webserver.DatabaseOptions {
            Host = "localhost",
            Port = 3306,
            Name = "moneygestor",
            User = "moneygestor",
            Password = "not-a-real-secret",
            BootstrapMode = (DatabaseBootstrapMode)999
        };

        Assert.That(webserver.DatabaseOptions.IsValid(options), Is.False);
    }

    [TearDown]
    public async Task TearDown() {
        try {
            foreach (var databaseName in databases) {
                await TestDatabaseRuntime.DropIsolatedDatabaseAsync(databaseName);
            }
        } finally {
            databases.Clear();
        }
    }

    [Test]
    public async Task MigrateCreatesMissingDatabaseAndIsIdempotent() {
        var databaseName = OwnDatabase();
        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        var bootstrapper = new LegacyDatabaseBootstrapper(database);

        var first = await bootstrapper.BootstrapAsync(DatabaseBootstrapMode.Migrate);
        var second = await bootstrapper.BootstrapAsync(DatabaseBootstrapMode.Migrate);

        var pendingMigrations = await database.Database.GetPendingMigrationsAsync();
        var databaseExists = await TestDatabaseRuntime.IsolatedDatabaseExistsAsync(databaseName);
        Assert.Multiple(() => {
            Assert.That(first, Is.EqualTo(DatabaseBootstrapOutcome.Migrated));
            Assert.That(second, Is.EqualTo(DatabaseBootstrapOutcome.UpToDate));
            Assert.That(pendingMigrations, Is.Empty);
            Assert.That(databaseExists, Is.True);
        });
    }

    [Test]
    public async Task WebStartupCreatesBothSchemasAndSeedsBeforeServing() {
        var databaseName = OwnDatabase();
        var configuration = TestDatabaseRuntime.CreateConfiguration()
            .ToDictionary(entry => entry.Key, entry => entry.Value);
        configuration["database:name"] = databaseName;
        configuration["database:bootstrapMode"] = "Migrate";

        using (var factory = new WebApplicationFactory<webserver.Program>()
            .WithWebHostBuilder(builder => {
                builder.UseEnvironment("Testing");
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                    configurationBuilder.AddInMemoryCollection(configuration));
            })) {
            using var client = factory.CreateClient();
            var response = await client.GetAsync("/swagger/v1/swagger.json");
            Assert.That(response.IsSuccessStatusCode, Is.True);
        }

        await using var legacy = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        await using var identity = TestDatabaseRuntime.CreateIsolatedIdentityContext(databaseName);
        var appliedLegacy = await legacy.Database.GetAppliedMigrationsAsync();
        var appliedIdentity = await identity.Database.GetAppliedMigrationsAsync();
        var colorCount = await legacy.Colors.CountAsync();
        var typeCount = await legacy.TransactionTypes.CountAsync();

        Assert.Multiple(() => {
            Assert.That(appliedLegacy, Does.Contain(LegacyDatabaseBootstrapper.BaselineMigrationId));
            Assert.That(appliedIdentity, Does.Contain("20260923173731_CreateIdentityAccountSchema"));
            Assert.That(colorCount, Is.EqualTo(9));
            Assert.That(typeCount, Is.EqualTo(2));
        });
    }

    [Test]
    public async Task DisabledModeDoesNotCreateMissingDatabase() {
        var databaseName = OwnDatabase();
        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);

        Assert.That(
            async () => await new LegacyDatabaseBootstrapper(database)
                .BootstrapAsync(DatabaseBootstrapMode.Disabled),
            Throws.InstanceOf<InvalidOperationException>());
        Assert.That(await TestDatabaseRuntime.IsolatedDatabaseExistsAsync(databaseName), Is.False);
    }

    [Test]
    public async Task DisabledModeAcceptsAnUpToDateSchemaWithoutChangingIt() {
        var databaseName = OwnDatabase();
        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        var bootstrapper = new LegacyDatabaseBootstrapper(database);
        await bootstrapper.BootstrapAsync(DatabaseBootstrapMode.Migrate);

        var outcome = await bootstrapper.BootstrapAsync(DatabaseBootstrapMode.Disabled);

        Assert.That(outcome, Is.EqualTo(DatabaseBootstrapOutcome.UpToDate));
        Assert.That(await database.Database.GetPendingMigrationsAsync(), Is.Empty);
    }

    [Test]
    public async Task AdoptEquivalentLegacySchemaPreservesData() {
        var databaseName = OwnDatabase();
        await using (var legacy = TestDatabaseRuntime.CreateIsolatedContext(databaseName)) {
            await legacy.Database.EnsureCreatedAsync();
            legacy.Users.Add(new UserDb {
                Id = 41,
                Firstname = "Legacy",
                Lastname = "User",
                Email = "legacy@example.test",
                Username = "legacy-user",
                Password = "legacy-hash"
            });
            await legacy.SaveChangesAsync();
        }

        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        var outcome = await new LegacyDatabaseBootstrapper(database)
            .BootstrapAsync(DatabaseBootstrapMode.MigrateAndAdoptLegacy);

        var preservedUsers = await database.Users.CountAsync(user => user.Id == 41);
        var appliedMigrations = await database.Database.GetAppliedMigrationsAsync();
        var pendingMigrations = await database.Database.GetPendingMigrationsAsync();
        Assert.Multiple(() => {
            Assert.That(outcome, Is.EqualTo(DatabaseBootstrapOutcome.AdoptedLegacySchema));
            Assert.That(preservedUsers, Is.EqualTo(1));
            Assert.That(appliedMigrations,
                Does.Contain(LegacyDatabaseBootstrapper.BaselineMigrationId));
            Assert.That(pendingMigrations, Is.Empty);
        });
    }

    [Test]
    public async Task MigrateModeRefusesUnadoptedLegacySchema() {
        var databaseName = OwnDatabase();
        await using (var legacy = TestDatabaseRuntime.CreateIsolatedContext(databaseName)) {
            await legacy.Database.EnsureCreatedAsync();
        }

        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        Assert.That(
            async () => await new LegacyDatabaseBootstrapper(database)
                .BootstrapAsync(DatabaseBootstrapMode.Migrate),
            Throws.InstanceOf<InvalidOperationException>()
                .With.Message.Contains("legacy MoneyGestor schema"));
        Assert.That(await database.Database.GetAppliedMigrationsAsync(),
            Does.Not.Contain(LegacyDatabaseBootstrapper.BaselineMigrationId));
    }

    [Test]
    public async Task AdoptRefusesDivergentSchemaWithoutChangingHistory() {
        var databaseName = OwnDatabase();
        await using (var legacy = TestDatabaseRuntime.CreateIsolatedContext(databaseName)) {
            await legacy.Database.EnsureCreatedAsync();
            await legacy.Database.ExecuteSqlRawAsync("DROP INDEX `IX_wallet_Id` ON `wallet`");
        }

        await using var database = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        Assert.That(
            async () => await new LegacyDatabaseBootstrapper(database)
                .BootstrapAsync(DatabaseBootstrapMode.MigrateAndAdoptLegacy),
            Throws.InstanceOf<InvalidOperationException>()
                .With.Message.Contains("adoption refused"));
        Assert.That(await database.Database.GetAppliedMigrationsAsync(),
            Does.Not.Contain(LegacyDatabaseBootstrapper.BaselineMigrationId));
    }

    [Test]
    public async Task SeedFailureRollsBackEveryGlobalRow() {
        var databaseName = OwnDatabase();
        await using (var migrated = TestDatabaseRuntime.CreateIsolatedContext(databaseName)) {
            await new LegacyDatabaseBootstrapper(migrated)
                .BootstrapAsync(DatabaseBootstrapMode.Migrate);
        }

        await using (var failing = TestDatabaseRuntime.CreateIsolatedContext(
            databaseName,
            new ThrowOnSaveChangesInterceptor())) {
            Assert.That(
                async () => await new DatabaseInitializer(failing).InitAsync(),
                Throws.InstanceOf<InvalidOperationException>());
        }

        await using var verification = TestDatabaseRuntime.CreateIsolatedContext(databaseName);
        var colorCount = await verification.Colors.CountAsync();
        var typeCount = await verification.TransactionTypes.CountAsync();
        Assert.Multiple(() => {
            Assert.That(colorCount, Is.Zero);
            Assert.That(typeCount, Is.Zero);
        });
    }

    private String OwnDatabase() {
        var databaseName = TestDatabaseRuntime.CreateIsolatedDatabaseName();
        databases.Add(databaseName);
        return databaseName;
    }

    private sealed class ThrowOnSaveChangesInterceptor : SaveChangesInterceptor {
        public override ValueTask<InterceptionResult<Int32>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<Int32> result,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromException<InterceptionResult<Int32>>(
                new InvalidOperationException("Injected seed failure."));
    }
}

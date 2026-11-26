using ExportImportApplication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace DatabaseTransferTests;

[TestFixture]
[NonParallelizable]
public sealed class ConfigurationTest {
    private const String SettingsVariable = "BACKEND_APP_SETTINGS";
    private const String ConnectionVariable = "MONEYGESTOR_ADMIN_CONNECTION_STRING";
    private String? originalSettings;
    private String? originalConnection;
    private String fixturePath = null!;

    [SetUp]
    public void SetUp() {
        originalSettings = Environment.GetEnvironmentVariable(SettingsVariable);
        originalConnection = Environment.GetEnvironmentVariable(ConnectionVariable);
        fixturePath = Path.Combine(Path.GetTempPath(), $"mg-configuration-{Guid.NewGuid():N}.json");
        Environment.SetEnvironmentVariable(SettingsVariable, fixturePath);
        Environment.SetEnvironmentVariable(ConnectionVariable, null);
    }

    [TearDown]
    public void TearDown() {
        Environment.SetEnvironmentVariable(SettingsVariable, originalSettings);
        Environment.SetEnvironmentVariable(ConnectionVariable, originalConnection);
        File.Delete(fixturePath);
    }

    [Test]
    public void ExplicitJsonIsAuthoritativeAndPreservesCredentialCharacters() {
        const String password = "synthetic;password=\"quoted\"$value";
        File.WriteAllText(fixturePath, JsonSerializer.Serialize(new {
            database = new { host = "db.example.test", port = 3307, name = "configured_db", user = "configured_user", password }
        }));
        Environment.SetEnvironmentVariable(ConnectionVariable, "Server=other.example.test;Database=other_db;User ID=other;Password=unused");

        Assert.That(DatabaseConnection.TryRead(out var connection, out var error), Is.True, error);
        using (Assert.EnterMultipleScope()) {
            Assert.That(connection.Server, Is.EqualTo("db.example.test"));
            Assert.That(connection.Port, Is.EqualTo(3307));
            Assert.That(connection.Database, Is.EqualTo("configured_db"));
            Assert.That(connection.UserID, Is.EqualTo("configured_user"));
            Assert.That(connection.Password, Is.EqualTo(password));
        }
    }

    [Test]
    public void InvalidJsonDoesNotExposeItsContentsOrFallBackToAnotherDatabase() {
        const String secret = "synthetic-secret-must-not-be-logged";
        File.WriteAllText(fixturePath, "{\"database\":{\"password\":\"" + secret);
        Environment.SetEnvironmentVariable(ConnectionVariable, "Server=other.example.test;Database=other_db;User ID=other;Password=unused");

        Assert.That(DatabaseConnection.TryRead(out _, out var error), Is.False);
        Assert.That(error, Does.Not.Contain(secret));
    }

    [TestCase(0)]
    [TestCase(65536)]
    public void InvalidPortIsRejectedBeforeAnyDatabaseConnection(Int32 port) {
        File.WriteAllText(fixturePath, JsonSerializer.Serialize(new {
            database = new { host = "db.example.test", port, name = "configured_db", user = "configured_user", password = "synthetic" }
        }));

        Assert.That(DatabaseConnection.TryRead(out _, out _), Is.False);
    }

    [Test]
    public void LegacyAdministrativeConnectionStillWorksWithoutExplicitJsonPath() {
        Environment.SetEnvironmentVariable(SettingsVariable, null);
        Environment.SetEnvironmentVariable(ConnectionVariable, "Server=admin.example.test;Database=admin_db;User ID=admin;Password=synthetic");

        Assert.That(DatabaseConnection.TryRead(out var connection, out var error), Is.True, error);
        Assert.That(connection.Database, Is.EqualTo("admin_db"));
    }

    [Test]
    public async Task ApiReadsJsonWithoutEnvironmentOverrides() {
        const String overrideVariable = "database__host";
        const String environmentVariable = "ASPNETCORE_ENVIRONMENT";
        const String keysVariable = "DATA_PROTECTION_KEYS_PATH";
        var previousHost = Environment.GetEnvironmentVariable(overrideVariable);
        var previousEnvironment = Environment.GetEnvironmentVariable(environmentVariable);
        var previousKeys = Environment.GetEnvironmentVariable(keysVariable);
        var keysPath = fixturePath + ".keys";
        File.WriteAllText(fixturePath, JsonSerializer.Serialize(new {
            database = new { host = "db.example.test", port = 3307, name = "configured_db", user = "configured_user", password = "synthetic" },
            log = new { level = "Warning", output = new { console = true } },
            security = new { requireConfirmedEmail = false, allowedOrigins = new[] { "https://moneygestor.example.test" } }
        }));
        try {
            Environment.SetEnvironmentVariable(overrideVariable, "unintended.example.test");
            Environment.SetEnvironmentVariable(environmentVariable, "Development");
            Environment.SetEnvironmentVariable(keysVariable, keysPath);
            await using var application = webserver.Program.BuildApplication([]);
            var options = application.Services.GetRequiredService<IOptions<webserver.DatabaseOptions>>().Value;
            Assert.That(options.Host, Is.EqualTo("db.example.test"));
        } finally {
            Environment.SetEnvironmentVariable(overrideVariable, previousHost);
            Environment.SetEnvironmentVariable(environmentVariable, previousEnvironment);
            Environment.SetEnvironmentVariable(keysVariable, previousKeys);
            if (Directory.Exists(keysPath)) { Directory.Delete(keysPath); }
        }
    }

    [TestCase("initialize")]
    [TestCase("export")]
    [TestCase("import")]
    public void ComposeCanSelectDatabaseFromJsonWithoutDuplicatingItsName(String operation) {
        var arguments = new List<String> { operation, "--configured-database" };
        if (operation == "export") { arguments.Add("--maintenance"); }
        if (operation == "import") { arguments.AddRange(["--file", "fixture.zip"]); }

        Assert.That(CliArguments.TryParse(arguments.ToArray(), out var options, out var error), Is.True, error);
        Assert.That(options.UseConfiguredDatabase, Is.True);
    }

    [TestCase("delete", false)]
    [TestCase("initialize", true)]
    public void ConfiguredDatabaseCannotBypassDeletionOrTargetConfirmation(String operation, Boolean explicitDatabase) {
        var arguments = new List<String> { operation, "--configured-database" };
        if (explicitDatabase) { arguments.AddRange(["--database", "other_db"]); }

        Assert.That(CliArguments.TryParse(arguments.ToArray(), out _, out _), Is.False);
    }
}

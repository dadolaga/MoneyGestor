using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Writers;
using Swashbuckle.AspNetCore.Swagger;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TestProject.Api;

[TestFixture]
[Category("Api")]
internal sealed class OpenApiSnapshotTest {
    private WebApplicationFactory<webserver.Program> factory = null!;

    [OneTimeSetUp]
    public void StartHost() {
        factory = new WebApplicationFactory<webserver.Program>()
            .WithWebHostBuilder(builder => {
                builder.UseEnvironment("Testing");
                builder.ConfigureAppConfiguration((_, configuration) =>
                    configuration.AddInMemoryCollection(TestDatabaseRuntime.CreateConfiguration()));
            });
    }

    [OneTimeTearDown]
    public void StopHost() => factory?.Dispose();

    [TestCase("v1")]
    [TestCase("legacy")]
    public void OpenApiContractMatchesCommittedSnapshot(String documentName) {
        var provider = factory.Services.GetRequiredService<ISwaggerProvider>();
        var document = provider.GetSwagger(documentName);
        using var writerBuffer = new StringWriter(System.Globalization.CultureInfo.InvariantCulture);
        var writer = new OpenApiJsonWriter(writerBuffer);
        document.SerializeAsV3(writer);
        writer.Flush();

        var snapshot = Canonicalize(JsonNode.Parse(writerBuffer.ToString())!).ToJsonString(new JsonSerializerOptions {
            WriteIndented = true
        }) + Environment.NewLine;
        var snapshotPath = Path.Combine(FindRepositoryRoot(), "docs", "openapi", $"{documentName}.json");
        if (Environment.GetEnvironmentVariable("UPDATE_OPENAPI_SNAPSHOT") == "1") {
            Directory.CreateDirectory(Path.GetDirectoryName(snapshotPath)!);
            File.WriteAllText(snapshotPath, snapshot);
        }

        Assert.That(File.Exists(snapshotPath), Is.True, $"Missing snapshot {snapshotPath}. Set UPDATE_OPENAPI_SNAPSHOT=1 to regenerate it.");
        Assert.That(File.ReadAllText(snapshotPath), Is.EqualTo(snapshot), $"OpenAPI {documentName} changed. Review and regenerate the snapshot intentionally.");
    }

    private static JsonNode Canonicalize(JsonNode node) => node switch {
        JsonObject jsonObject => new JsonObject(jsonObject.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => KeyValuePair.Create(pair.Key, pair.Value == null ? null : Canonicalize(pair.Value)))),
        JsonArray jsonArray => new JsonArray(jsonArray.Select(item => item == null ? null : Canonicalize(item)).ToArray()),
        _ => node.DeepClone()
    };

    private static String FindRepositoryRoot() {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent) {
            if (File.Exists(Path.Combine(directory.FullName, "backend.sln"))) return directory.Parent!.FullName;
        }
        throw new DirectoryNotFoundException("Could not locate the repository root.");
    }
}

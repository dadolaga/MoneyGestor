using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using logic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace TestProject.Api;

[TestFixture]
[Category("Api")]
internal class LegacyApiCharacterizationTest {
    private WebApplicationFactory<webserver.Program> factory = null!;
    private HttpClient client = null!;

    [OneTimeSetUp]
    public void StartHost() {
        factory = new WebApplicationFactory<webserver.Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Testing"));
        client = factory.CreateClient(new WebApplicationFactoryClientOptions {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost")
        });
    }

    [TearDown]
    public async Task CleanDatabase() {
        using var database = DatabaseFactory.Use();
        await database.Transactions.ExecuteDeleteAsync();
        await database.Wallets.ExecuteDeleteAsync();
        await database.TransactionTypes.Where(type => type.UserId != null).ExecuteDeleteAsync();
        await database.Colors.Where(color => color.UserId != null).ExecuteDeleteAsync();
        await database.Logins.ExecuteDeleteAsync();
        await database.Users.ExecuteDeleteAsync();
    }

    [OneTimeTearDown]
    public void StopHost() {
        client?.Dispose();
        factory?.Dispose();
    }

    [Test]
    public async Task RegisterAndLoginUseLegacyEnvelopeAndCamelCaseJson() {
        var registerResponse = await client.PostAsJsonAsync("/user/add", new {
            firstname = "Api",
            lastname = "Test",
            username = "api_test",
            email = "api@test.me",
            password = "Password123!"
        });

        Assert.That(registerResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using (var registerJson = JsonDocument.Parse(await registerResponse.Content.ReadAsStringAsync())) {
            Assert.That(registerJson.RootElement.GetProperty("code").GetUInt32(), Is.Zero);
            Assert.That(registerJson.RootElement.GetProperty("message").GetString(), Is.EqualTo("user"));
            Assert.That(registerJson.RootElement.GetProperty("data").GetUInt64(), Is.GreaterThan(0));
            Assert.That(registerJson.RootElement.TryGetProperty("Code", out _), Is.False);
        }

        var loginResponse = await client.PostAsJsonAsync("/user/login", new {
            user = "api@test.me",
            password = "Password123!",
            remember = false
        });

        Assert.That(loginResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var loginJson = JsonDocument.Parse(await loginResponse.Content.ReadAsStringAsync());
        Assert.That(loginJson.RootElement.GetProperty("code").GetUInt32(), Is.Zero);
        Assert.That(loginJson.RootElement.GetProperty("message").GetString(), Is.EqualTo("Login correct"));
        Assert.That(loginJson.RootElement.GetProperty("data").GetString(), Is.Not.Empty);
    }

    [Test]
    public async Task InvalidLoginUsesLegacyApplicationError() {
        var response = await client.PostAsJsonAsync("/user/login", new {
            user = "missing@test.me",
            password = "invalid",
            remember = false
        });

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(json.RootElement.GetProperty("code").GetUInt32(), Is.EqualTo(111));
        Assert.That(json.RootElement.GetProperty("message").GetString(), Is.EqualTo("Login fail"));
        Assert.That(json.RootElement.GetProperty("data").ValueKind, Is.EqualTo(JsonValueKind.Null));
    }

    [Test]
    public async Task WalletValidationUsesLegacyApplicationError() {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/wallet") {
            Content = JsonContent.Create(new { })
        };
        request.Headers.Add("Authorization", "unused-for-validation");

        var response = await client.SendAsync(request);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(json.RootElement.GetProperty("code").GetUInt32(), Is.EqualTo(10));
        Assert.That(json.RootElement.GetProperty("message").GetString(), Is.EqualTo("Not all mandatory data inserted"));
    }

    [Test]
    public async Task CorsAllowsArbitraryOriginInCurrentConfiguration() {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/user/login");
        request.Headers.Add("Origin", "https://example.invalid");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await client.SendAsync(request);

        Assert.That(response.Headers.GetValues("Access-Control-Allow-Origin"), Is.EqualTo(new[] { "*" }));
    }

    [Test]
    public async Task SwaggerDescribesLegacyRoutesInTestingEnvironment() {
        var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var paths = json.RootElement.GetProperty("paths");
        Assert.That(paths.TryGetProperty("/user/login", out _), Is.True);
        Assert.That(paths.TryGetProperty("/wallet", out _), Is.True);
        Assert.That(paths.TryGetProperty("/transaction", out _), Is.True);
    }
}

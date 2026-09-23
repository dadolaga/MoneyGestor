using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using logic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using TestProject.Samples;
using TestProject.Utils;

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

    [Test]
    public async Task CrossUserWalletAndTransactionLookupsReturnTheSameNotFoundEnvelope() {
        var owner = new UserSample();
        var ownerExecutor = await TestUtils.CreateExecutorManagerForUser(owner);
        var wallet = new WalletSample();
        await ownerExecutor.Execute(wallet.AddWalletCommand);
        var movement = new TransactionSample(
            logic.DatabaseInitializer.ADJUSTMENT.Id,
            wallet.AddWalletCommand.Result,
            value: 5);
        await ownerExecutor.Execute(movement.AddTransactionCommand);

        var attacker = new UserSample(username: "attacker", email: "attacker@test.me");
        var attackerExecutor = await TestUtils.CreateExecutorManagerForUser(attacker);

        foreach (var path in new[] {
                     $"/wallet/{wallet.AddWalletCommand.Result}",
                     $"/transaction/{movement.AddTransactionCommand.Result}",
                     "/wallet/4294967295",
                     "/transaction/4294967295"
                 }) {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            Assert.That(
                request.Headers.TryAddWithoutValidation("Authorization", attackerExecutor.Token),
                Is.True);

            var response = await client.SendAsync(request);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound), path);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.That(json.RootElement.GetProperty("code").GetUInt32(), Is.EqualTo(404), path);
            Assert.That(json.RootElement.GetProperty("message").GetString(), Is.EqualTo("Resource not found"), path);
        }
    }

    [Test]
    public async Task TransactionBodyCannotSetOwnerAndResponseDoesNotExposeProfiles() {
        var actor = new UserSample();
        var actorExecutor = await TestUtils.CreateExecutorManagerForUser(actor);
        var wallet = new WalletSample();
        await actorExecutor.Execute(wallet.AddWalletCommand);

        var victim = new UserSample(username: "victim", email: "victim@test.me");
        await TestUtils.CreateExecutorManagerForUser(victim);

        using var createRequest = new HttpRequestMessage(HttpMethod.Post, "/transaction") {
            Content = JsonContent.Create(new {
                description = "owned-by-actor",
                date = "2026-09-22T00:00:00",
                value = 5,
                transactionType = new { id = logic.DatabaseInitializer.ADJUSTMENT.Id },
                wallet = new { id = wallet.AddWalletCommand.Result },
                user = new {
                    id = victim.AddNewUserExecutor.Result,
                    firstname = victim.FirstName,
                    lastname = victim.LastName,
                    email = victim.Email,
                    username = victim.Username
                }
            })
        };
        Assert.That(
            createRequest.Headers.TryAddWithoutValidation("Authorization", actorExecutor.Token),
            Is.True);

        var createResponse = await client.SendAsync(createRequest);
        Assert.That(createResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var createJson = JsonDocument.Parse(await createResponse.Content.ReadAsStringAsync());
        var transactionId = createJson.RootElement.GetProperty("data").GetUInt64();

        using (var database = DatabaseFactory.Use()) {
            var stored = await database.Transactions.SingleAsync(transaction => transaction.Id == transactionId);
            Assert.Multiple(() => {
                Assert.That(stored.UserId, Is.EqualTo(actor.AddNewUserExecutor.Result));
                Assert.That(stored.UserInsertId, Is.EqualTo(actor.AddNewUserExecutor.Result));
            });
        }

        using var getRequest = new HttpRequestMessage(HttpMethod.Get, $"/transaction/{transactionId}");
        Assert.That(
            getRequest.Headers.TryAddWithoutValidation("Authorization", actorExecutor.Token),
            Is.True);
        var getResponse = await client.SendAsync(getRequest);
        Assert.That(getResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var getJson = JsonDocument.Parse(await getResponse.Content.ReadAsStringAsync());
        var data = getJson.RootElement.GetProperty("data");
        Assert.Multiple(() => {
            Assert.That(data.GetProperty("user").ValueKind, Is.EqualTo(JsonValueKind.Null));
            Assert.That(data.GetProperty("userInsert").ValueKind, Is.EqualTo(JsonValueKind.Null));
        });
    }

    [Test]
    public async Task TransactionListAndDashboardExcludeAnotherUsersMovements() {
        var owner = new UserSample();
        var ownerExecutor = await TestUtils.CreateExecutorManagerForUser(owner);
        var wallet = new WalletSample();
        await ownerExecutor.Execute(wallet.AddWalletCommand);
        var movement = new TransactionSample(
            logic.DatabaseInitializer.ADJUSTMENT.Id,
            wallet.AddWalletCommand.Result,
            value: 25);
        await ownerExecutor.Execute(movement.AddTransactionCommand);

        var other = new UserSample(username: "other", email: "other@test.me");
        var otherExecutor = await TestUtils.CreateExecutorManagerForUser(other);

        using var listRequest = new HttpRequestMessage(HttpMethod.Get, "/transaction?limit=10&offset=0");
        Assert.That(
            listRequest.Headers.TryAddWithoutValidation("Authorization", otherExecutor.Token),
            Is.True);
        var listResponse = await client.SendAsync(listRequest);
        Assert.That(listResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using (var listJson = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync())) {
            var listData = listJson.RootElement.GetProperty("data");
            Assert.That(listData.GetProperty("length").GetInt32(), Is.Zero);
            Assert.That(listData.GetProperty("data").GetArrayLength(), Is.Zero);
        }

        using var dashboardRequest = new HttpRequestMessage(
            HttpMethod.Get,
            "/dashboard/all?from=2026-09-01&to=2026-09-30");
        Assert.That(
            dashboardRequest.Headers.TryAddWithoutValidation("Authorization", otherExecutor.Token),
            Is.True);
        var dashboardResponse = await client.SendAsync(dashboardRequest);
        Assert.That(dashboardResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var dashboardJson = JsonDocument.Parse(await dashboardResponse.Content.ReadAsStringAsync());
        var dashboard = dashboardJson.RootElement.GetProperty("data");
        Assert.Multiple(() => {
            Assert.That(dashboard.GetProperty("incoming").GetDouble(), Is.Zero);
            Assert.That(dashboard.GetProperty("expense").GetDouble(), Is.Zero);
        });
    }
}

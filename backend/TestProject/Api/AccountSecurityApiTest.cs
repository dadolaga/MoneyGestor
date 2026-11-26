using database;
using database.Identity;
using logic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using webserver.Auth;

namespace TestProject.Api;

[TestFixture]
[Category("Api")]
internal sealed class AccountSecurityApiTest {
    private WebApplicationFactory<webserver.Program> factory = null!;
    private HttpClient client = null!;
    private CapturingEmailSender emails = null!;

    [OneTimeSetUp]
    public void StartHost() {
        emails = new CapturingEmailSender();
        factory = new WebApplicationFactory<webserver.Program>()
            .WithWebHostBuilder(builder => {
                builder.UseEnvironment("Testing");
                builder.ConfigureAppConfiguration((_, configuration) =>
                    configuration.AddInMemoryCollection(TestDatabaseRuntime.CreateConfiguration()));
                builder.ConfigureTestServices(services => {
                    services.RemoveAll<IAccountEmailSender>();
                    services.AddSingleton<IAccountEmailSender>(emails);
                });
            });
        client = factory.CreateClient(new WebApplicationFactoryClientOptions {
            AllowAutoRedirect = false,
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });
    }

    [TearDown]
    public async Task CleanDatabase() {
        using (var legacyData = TestDatabaseRuntime.CreateContext()) {
            await legacyData.Transactions.ExecuteDeleteAsync();
            await legacyData.Wallets.ExecuteDeleteAsync();
            await legacyData.TransactionTypes.Where(type => type.UserId != null).ExecuteDeleteAsync();
            await legacyData.Colors.Where(color => color.UserId != null).ExecuteDeleteAsync();
            await legacyData.Logins.ExecuteDeleteAsync();
        }

        await using (var identity = TestDatabaseRuntime.CreateIdentityContext()) {
            await identity.Users.ExecuteDeleteAsync();
        }

        using var database = TestDatabaseRuntime.CreateContext();
        await database.Users.ExecuteDeleteAsync();
        emails.Clear();
    }

    [OneTimeTearDown]
    public void StopHost() {
        client.Dispose();
        factory.Dispose();
    }

    [Test]
    public async Task RegistrationConfirmationLoginSessionAndLogoutUseProtectedCookieFlow() {
        var csrf = await GetCsrfAsync();
        var registration = await PostAsync("/api/v1/auth/register", new {
            firstname = "Secure",
            lastname = "User",
            username = "secure_user",
            email = "secure@test.me",
            password = "VeryStrong123!"
        }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(registration.StatusCode, Is.EqualTo(HttpStatusCode.Accepted), await registration.Content.ReadAsStringAsync());
            Assert.That(emails.ConfirmationLink, Is.Not.Null);
        }
        var duplicate = await PostAsync("/api/v1/auth/register", new {
            firstname = "Secure",
            lastname = "User",
            username = "secure_user",
            email = "secure@test.me",
            password = "VeryStrong123!"
        }, csrf);
        Assert.That(duplicate.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));

        var beforeConfirmation = await PostAsync("/api/v1/auth/login", new {
            user = "secure@test.me",
            password = "VeryStrong123!",
            remember = false
        }, csrf);
        Assert.That(beforeConfirmation.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));

        var query = ParseQuery(emails.ConfirmationLink!);
        var confirmation = await PostAsync("/api/v1/auth/confirm-email", new {
            userId = query["userId"],
            token = query["token"]
        }, csrf);
        Assert.That(confirmation.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var reused = await PostAsync("/api/v1/auth/confirm-email", new {
            userId = query["userId"],
            token = query["token"]
        }, csrf);
        Assert.That(reused.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));

        var login = await PostAsync("/api/v1/auth/login", new {
            user = "secure@test.me",
            password = "VeryStrong123!",
            remember = false
        }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
            Assert.That(login.Headers.TryGetValues("Set-Cookie", out var cookies), Is.True);
        }
        var authCookie = cookies!.Single(value => value.StartsWith("MoneyGestor.Auth="));
        using (Assert.EnterMultipleScope()) {
            Assert.That(authCookie, Does.Contain("httponly").IgnoreCase);
            Assert.That(authCookie, Does.Contain("secure").IgnoreCase);
            Assert.That(authCookie, Does.Contain("samesite=lax").IgnoreCase);
        }

        var session = await client.GetAsync("/api/v1/auth/session");
        Assert.That(session.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using (var json = JsonDocument.Parse(await session.Content.ReadAsStringAsync())) {
            using (Assert.EnterMultipleScope()) {
                Assert.That(json.RootElement.GetProperty("email").GetString(), Is.EqualTo("secure@test.me"));
                Assert.That(json.RootElement.TryGetProperty("password", out _), Is.False);
            }
        }

        var bridgedLegacySession = await client.GetAsync("/user/info");
        Assert.That(bridgedLegacySession.StatusCode, Is.EqualTo(HttpStatusCode.OK), await bridgedLegacySession.Content.ReadAsStringAsync());

        var logout = await PostAsync("/api/v1/auth/logout", new { }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(logout.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
            Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        }
    }

    [Test]
    public async Task UnsafeAccountEndpointRejectsMissingAntiforgeryToken() {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new {
            user = "nobody@test.me",
            password = "VeryStrong123!"
        });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await response.Content.ReadAsStringAsync());
    }

    [Test]
    public async Task V1ResourceRoutesRequireIdentityAndUseDTOsWithAntiforgery() {
        var anonymous = await client.GetAsync("/api/v1/wallets");
        using (Assert.EnterMultipleScope()) {
            Assert.That(anonymous.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
            Assert.That(anonymous.Content.Headers.ContentType?.MediaType, Is.EqualTo("application/problem+json"));
        }

        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("resource_user", "resource@test.me", "VeryStrong123!", csrf);
        var login = await PostAsync("/api/v1/auth/login", new {
            user = "resource@test.me", password = "VeryStrong123!", remember = false
        }, csrf);
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var withoutCsrf = await client.PostAsJsonAsync("/api/v1/wallets", new {
            name = "Unsafe", initialValue = 25m, colorId = 1
        });
        Assert.That(withoutCsrf.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));

        var created = await PostAsync("/api/v1/wallets", new {
            id = 5000,
            name = "Everyday",
            initialValue = 25.50m,
            currentValue = 999999m,
            favorite = true,
            colorId = 1,
            userId = 9000
        }, csrf);
        Assert.That(created.StatusCode, Is.EqualTo(HttpStatusCode.Created), await created.Content.ReadAsStringAsync());
        using var createdJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var walletId = createdJson.RootElement.GetProperty("id").GetUInt64();
        Assert.That(created.Headers.Location?.ToString(), Does.Contain($"/api/v1/wallets/{walletId}"));

        var list = await client.GetAsync("/api/v1/wallets");
        Assert.That(list.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using var listJson = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        var wallet = listJson.RootElement.EnumerateArray().Single();
        using (Assert.EnterMultipleScope()) {
            Assert.That(wallet.GetProperty("initialValue").GetDecimal(), Is.EqualTo(25.50m));
            Assert.That(wallet.GetProperty("currentValue").GetDecimal(), Is.EqualTo(25.50m));
            Assert.That(wallet.GetProperty("favorite").GetBoolean(), Is.False);
            Assert.That(wallet.TryGetProperty("userId", out _), Is.False);
        }

        var dashboard = await client.GetAsync("/api/v1/dashboard?from=2026-09-01&to=2026-09-30");
        Assert.That(dashboard.StatusCode, Is.EqualTo(HttpStatusCode.OK), await dashboard.Content.ReadAsStringAsync());
    }

    [Test]
    public async Task ForgotPasswordIsEnumerationSafeAndResetTokenIsSingleUse() {
        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("reset_user", "reset@test.me", "VeryStrong123!", csrf);
        var login = await PostAsync("/api/v1/auth/login", new {
            user = "reset@test.me",
            password = "VeryStrong123!"
        }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
            Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        }

        var missing = await PostAsync("/api/v1/auth/forgot-password", new { email = "missing@test.me" }, csrf);
        var existing = await PostAsync("/api/v1/auth/forgot-password", new { email = "reset@test.me" }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(missing.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));
            Assert.That(existing.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));
        }

        var query = ParseQuery(emails.ResetLink!);
        var reset = await PostAsync("/api/v1/auth/reset-password", new {
            email = query["email"],
            token = query["token"],
            password = "EvenStronger456!"
        }, csrf);
        using (Assert.EnterMultipleScope()) {
            Assert.That(reset.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
            Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
        }

        var reused = await PostAsync("/api/v1/auth/reset-password", new {
            email = query["email"],
            token = query["token"],
            password = "AnotherStrong789!"
        }, csrf);
        Assert.That(reused.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task RepeatedFailedLoginsLockTheAccount() {
        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("locked_user", "locked@test.me", "VeryStrong123!", csrf);

        for (var attempt = 0; attempt < 5; attempt++) {
            await PostAsync("/api/v1/auth/login", new {
                user = "locked@test.me",
                password = "WrongPassword123!"
            }, csrf);
        }

        var response = await PostAsync("/api/v1/auth/login", new {
            user = "locked@test.me",
            password = "VeryStrong123!"
        }, csrf);
        Assert.That(response.StatusCode, Is.EqualTo((HttpStatusCode) 423));
    }

    [Test]
    public async Task LoginRateLimitCombinesIpAndNormalizedIdentity() {
        var csrf = await GetCsrfAsync();
        HttpResponseMessage? response = null;
        for (var attempt = 0; attempt < 21; attempt++) {
            response?.Dispose();
            response = await PostAsync("/api/v1/auth/login", new {
                user = "RATE-LIMIT-MISSING@test.me",
                password = "WrongPassword123!"
            }, csrf);
        }

        using (response) {
            Assert.That(response!.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        }
    }

    [Test]
    public async Task FailedIdentityCreationRollsBackLegacyRegistration() {
        var csrf = await GetCsrfAsync();
        var invalid = await PostAsync("/api/v1/auth/register", new {
            firstname = "Atomic", lastname = "User", username = "atomic_user",
            email = "atomic@test.me", password = "PasswordWithoutSymbol123"
        }, csrf);
        Assert.That(invalid.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));

        await using (var legacy = TestDatabaseRuntime.CreateContext()) {
            Assert.That(await legacy.Users.AnyAsync(user => user.Username == "atomic_user"), Is.False);
        }

        await using (var identity = TestDatabaseRuntime.CreateIdentityContext()) {
            Assert.That(await identity.Users.AnyAsync(user => user.UserName == "atomic_user"), Is.False);
        }

        var valid = await PostAsync("/api/v1/auth/register", new {
            firstname = "Atomic", lastname = "User", username = "atomic_user",
            email = "atomic@test.me", password = "VeryStrong123!"
        }, csrf);
        Assert.That(valid.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));
    }

    [Test]
    public async Task LegacyRegistrationHidesDuplicateIdAndLoginIsRateLimited() {
        var body = new {
            firstname = "Legacy", lastname = "User", username = "legacy_rate_user",
            email = "legacy.rate@test.me", password = "VeryStrong123!"
        };
        var created = await client.PostAsJsonAsync("/user/add", body);
        using var createdJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        Assert.That(createdJson.RootElement.GetProperty("data").GetUInt64(), Is.GreaterThan(0));

        var duplicate = await client.PostAsJsonAsync("/user/add", body);
        using var duplicateJson = JsonDocument.Parse(await duplicate.Content.ReadAsStringAsync());
        Assert.That(duplicateJson.RootElement.GetProperty("data").GetUInt64(), Is.Zero);

        HttpResponseMessage? response = null;
        for (var attempt = 0; attempt < 21; attempt++) {
            response?.Dispose();
            response = await client.PostAsJsonAsync("/user/login", new {
                user = "legacy-rate-missing@test.me", password = "WrongPassword123!"
            });
        }

        using (response) {
            Assert.That(response!.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        }
    }

    [Test]
    public void ExhaustedIpBudgetDoesNotCreateUnlimitedIdentityCounters() {
        var guard = new AccountAbuseGuard(TimeProvider.System);
        for (var attempt = 0; attempt < 30; attempt++) {
            guard.Permit("login", "198.51.100.1", $"identity-{attempt}", 2, TimeSpan.FromHours(1));
        }

        using (Assert.EnterMultipleScope()) {
            Assert.That(guard.TrackedIdentityCount, Is.LessThanOrEqualTo(8));
            Assert.That(guard.Permit("login", "198.51.100.2", "new-user", 2, TimeSpan.FromHours(1)), Is.True);
        }
    }

    [Test]
    public async Task V1RejectsMissingDateAndExtremeDecimalAsValidationErrors() {
        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("validation_user", "validation@test.me", "VeryStrong123!", csrf);
        var login = await PostAsync("/api/v1/auth/login", new {
            user = "validation@test.me", password = "VeryStrong123!"
        }, csrf);
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var amount = await PostAsync("/api/v1/wallets", new {
            name = "Extreme", initialValue = Decimal.MinValue, colorId = 1
        }, csrf);
        Assert.That(amount.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await amount.Content.ReadAsStringAsync());

        var date = await PostAsync("/api/v1/transactions", new {
            description = "Missing date", value = 1m, typeId = 2, walletId = 1
        }, csrf);
        Assert.That(date.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await date.Content.ReadAsStringAsync());

        var tooEarly = await PostAsync("/api/v1/transactions", new {
            date = "0001-01-01", value = 1m, typeId = 2, walletId = 1
        }, csrf);
        Assert.That(tooEarly.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), await tooEarly.Content.ReadAsStringAsync());
    }

    [Test]
    public async Task TransactionPatchDistinguishesOmittedDescriptionFromExplicitNull() {
        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("patch_user", "patch@test.me", "VeryStrong123!", csrf);
        var login = await PostAsync("/api/v1/auth/login", new {
            user = "patch@test.me", password = "VeryStrong123!"
        }, csrf);
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

        var wallet = await PostAsync("/api/v1/wallets", new {
            name = "Patch wallet", initialValue = 0m, colorId = 1
        }, csrf);
        using var walletJson = JsonDocument.Parse(await wallet.Content.ReadAsStringAsync());
        var walletId = walletJson.RootElement.GetProperty("id").GetUInt64();
        var transaction = await PostAsync("/api/v1/transactions", new {
            description = "Short", longDescription = "Long", date = "2026-09-30",
            value = -1m, typeId = 2, walletId
        }, csrf);
        Assert.That(transaction.StatusCode, Is.EqualTo(HttpStatusCode.Created), await transaction.Content.ReadAsStringAsync());
        using var transactionJson = JsonDocument.Parse(await transaction.Content.ReadAsStringAsync());
        var id = transactionJson.RootElement.GetProperty("id").GetUInt64();

        async Task<HttpResponseMessage> patchAsync(Object body) {
            using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/transactions/{id}") {
                Content = JsonContent.Create(body)
            };
            request.Headers.Add("X-CSRF-TOKEN", csrf);
            return await client.SendAsync(request);
        }

        var clearShort = await patchAsync(new { description = (String?) null });
        Assert.That(clearShort.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await clearShort.Content.ReadAsStringAsync());
        var afterShort = await client.GetAsync($"/api/v1/transactions/{id}");
        using (var json = JsonDocument.Parse(await afterShort.Content.ReadAsStringAsync())) {
            using (Assert.EnterMultipleScope()) {
                Assert.That(json.RootElement.GetProperty("description").ValueKind, Is.EqualTo(JsonValueKind.Null));
                Assert.That(json.RootElement.GetProperty("longDescription").GetString(), Is.EqualTo("Long"));
            }
        }

        var clearLong = await patchAsync(new { longDescription = (String?) null });
        Assert.That(clearLong.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await clearLong.Content.ReadAsStringAsync());
        var afterLong = await client.GetAsync($"/api/v1/transactions/{id}");
        using var finalJson = JsonDocument.Parse(await afterLong.Content.ReadAsStringAsync());
        Assert.That(finalJson.RootElement.GetProperty("longDescription").ValueKind, Is.EqualTo(JsonValueKind.Null));
    }

    [Test]
    public async Task CorsAllowsConfiguredCredentialedOriginAndRejectsOtherOrigins() {
        using var allowed = new HttpRequestMessage(HttpMethod.Options, "/api/v1/auth/login");
        allowed.Headers.Add("Origin", "http://localhost:3000");
        allowed.Headers.Add("Access-Control-Request-Method", "POST");
        var allowedResponse = await client.SendAsync(allowed);
        using (Assert.EnterMultipleScope()) {
            Assert.That(allowedResponse.Headers.GetValues("Access-Control-Allow-Origin"), Is.EqualTo(["http://localhost:3000"]));
            Assert.That(allowedResponse.Headers.GetValues("Access-Control-Allow-Credentials"), Is.EqualTo(["true"]));
        }

        using var denied = new HttpRequestMessage(HttpMethod.Options, "/api/v1/auth/login");
        denied.Headers.Add("Origin", "https://example.invalid");
        denied.Headers.Add("Access-Control-Request-Method", "POST");
        var deniedResponse = await client.SendAsync(denied);
        Assert.That(deniedResponse.Headers.Contains("Access-Control-Allow-Origin"), Is.False);
    }

    private async Task RegisterAndConfirmAsync(String username, String email, String password, String csrf) {
        await PostAsync("/api/v1/auth/register", new {
            firstname = "Reset",
            lastname = "User",
            username,
            email,
            password
        }, csrf);
        var query = ParseQuery(emails.ConfirmationLink!);
        await PostAsync("/api/v1/auth/confirm-email", new { userId = query["userId"], token = query["token"] }, csrf);
    }

    private async Task<String> GetCsrfAsync() {
        var response = await client.GetAsync("/api/v1/auth/antiforgery");
        response.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("token").GetString()!;
    }

    private Task<HttpResponseMessage> PostAsync(String path, Object body, String csrf) {
        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", csrf);
        return client.SendAsync(request);
    }

    private static Dictionary<String, String> ParseQuery(String link) =>
        new Uri(link).Query.TrimStart('?').Split('&')
            .Select(part => part.Split('=', 2))
            .ToDictionary(parts => parts[0], parts => Uri.UnescapeDataString(parts[1]));

    private sealed class CapturingEmailSender : IAccountEmailSender {
        public String? ConfirmationLink { get; private set; }
        public String? ResetLink { get; private set; }

        public Task SendConfirmationAsync(String destination, String link, CancellationToken cancellationToken) {
            ConfirmationLink = link;
            return Task.CompletedTask;
        }

        public Task SendPasswordResetAsync(String destination, String link, CancellationToken cancellationToken) {
            ResetLink = link;
            return Task.CompletedTask;
        }

        public void Clear() {
            ConfirmationLink = null;
            ResetLink = null;
        }
    }

}
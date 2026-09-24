using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using database;
using database.Identity;
using logic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;
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
        await using (var identity = TestDatabaseRuntime.CreateIdentityContext()) {
            await identity.Users.ExecuteDeleteAsync();
        }
        using var database = TestDatabaseRuntime.CreateContext();
        await database.Logins.ExecuteDeleteAsync();
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
        Assert.That(registration.StatusCode, Is.EqualTo(HttpStatusCode.Accepted), await registration.Content.ReadAsStringAsync());
        Assert.That(emails.ConfirmationLink, Is.Not.Null);
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
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That(login.Headers.TryGetValues("Set-Cookie", out var cookies), Is.True);
        var authCookie = cookies!.Single(value => value.StartsWith("MoneyGestor.Auth="));
        Assert.Multiple(() => {
            Assert.That(authCookie, Does.Contain("httponly").IgnoreCase);
            Assert.That(authCookie, Does.Contain("secure").IgnoreCase);
            Assert.That(authCookie, Does.Contain("samesite=lax").IgnoreCase);
        });

        var session = await client.GetAsync("/api/v1/auth/session");
        Assert.That(session.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        using (var json = JsonDocument.Parse(await session.Content.ReadAsStringAsync())) {
            Assert.That(json.RootElement.GetProperty("email").GetString(), Is.EqualTo("secure@test.me"));
            Assert.That(json.RootElement.TryGetProperty("password", out _), Is.False);
        }

        var bridgedLegacySession = await client.GetAsync("/user/info");
        Assert.That(bridgedLegacySession.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var logout = await PostAsync("/api/v1/auth/logout", new { }, csrf);
        Assert.That(logout.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
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
    public async Task ForgotPasswordIsEnumerationSafeAndResetTokenIsSingleUse() {
        var csrf = await GetCsrfAsync();
        await RegisterAndConfirmAsync("reset_user", "reset@test.me", "VeryStrong123!", csrf);
        var login = await PostAsync("/api/v1/auth/login", new {
            user = "reset@test.me",
            password = "VeryStrong123!"
        }, csrf);
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var missing = await PostAsync("/api/v1/auth/forgot-password", new { email = "missing@test.me" }, csrf);
        var existing = await PostAsync("/api/v1/auth/forgot-password", new { email = "reset@test.me" }, csrf);
        Assert.Multiple(() => {
            Assert.That(missing.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));
            Assert.That(existing.StatusCode, Is.EqualTo(HttpStatusCode.Accepted));
        });

        var query = ParseQuery(emails.ResetLink!);
        var reset = await PostAsync("/api/v1/auth/reset-password", new {
            email = query["email"],
            token = query["token"],
            password = "EvenStronger456!"
        }, csrf);
        Assert.That(reset.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        Assert.That((await client.GetAsync("/api/v1/auth/session")).StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));

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
        Assert.That(response.StatusCode, Is.EqualTo((HttpStatusCode)423));
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
    public async Task LegacyPasswordIsRehashedByIdentityOnFirstSuccessfulLogin() {
        using var legacy = TestDatabaseRuntime.CreateContext();
        var legacyUser = new database.Models.UserDb {
            Firstname = "Legacy",
            Lastname = "User",
            Username = "legacy_identity",
            Email = "legacy.identity@test.me",
            Password = global::PasswordHasher.Hash("LegacyStrong123!")
        };
        legacy.Users.Add(legacyUser);
        await legacy.SaveChangesAsync();

        using (var scope = factory.Services.CreateScope()) {
            await scope.ServiceProvider.GetRequiredService<LegacyIdentityBootstrapper>().RunAsync();
        }

        var csrf = await GetCsrfAsync();
        var login = await PostAsync("/api/v1/auth/login", new {
            user = legacyUser.Username,
            password = "LegacyStrong123!"
        }, csrf);
        Assert.That(login.StatusCode, Is.EqualTo(HttpStatusCode.NoContent), await login.Content.ReadAsStringAsync());

        using var verificationScope = factory.Services.CreateScope();
        var manager = verificationScope.ServiceProvider.GetRequiredService<UserManager<ApplicationIdentityUser>>();
        var identity = await manager.FindByNameAsync(legacyUser.Username);
        Assert.That(identity!.PasswordHash, Does.Not.Contain(":"));
    }

    [Test]
    public async Task CorsAllowsConfiguredCredentialedOriginAndRejectsOtherOrigins() {
        using var allowed = new HttpRequestMessage(HttpMethod.Options, "/api/v1/auth/login");
        allowed.Headers.Add("Origin", "http://localhost:3000");
        allowed.Headers.Add("Access-Control-Request-Method", "POST");
        var allowedResponse = await client.SendAsync(allowed);
        Assert.That(allowedResponse.Headers.GetValues("Access-Control-Allow-Origin"), Is.EqualTo(new[] { "http://localhost:3000" }));
        Assert.That(allowedResponse.Headers.GetValues("Access-Control-Allow-Credentials"), Is.EqualTo(new[] { "true" }));

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

using database;
using logic;
using logic.Commands.Wallets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TestProject.Base;
using TestProject.Samples;
using TestProject.Utils;

namespace TestProject.Infrastructure;

[TestFixture]
[Category("Integration")]
internal sealed class Arc20DependencyInjectionTest : DatabaseBase {
    [TearDown]
    public async Task CleanDatabase() {
        await using var database = TestDatabaseRuntime.CreateContext();
        await database.Transactions.ExecuteDeleteAsync();
        await database.Wallets.ExecuteDeleteAsync();
        await database.Logins.ExecuteDeleteAsync();
        await database.Users.ExecuteDeleteAsync();
    }

    [Test]
    public void DatabaseConfigurationRequiresEveryConnectionField() {
        var invalid = new webserver.DatabaseOptions {
            Host = "localhost",
            Port = 3306,
            Name = "moneygestor",
            User = ""
        };

        Assert.That(webserver.DatabaseOptions.IsValid(invalid), Is.False);
        Assert.Multiple(() => {
            Assert.That(invalid.User, Is.Empty);
            Assert.That(invalid.Password, Is.Empty);
        });
    }

    [Test]
    public void WebCompositionUsesOneContextPerScopeAndDifferentContextsAcrossScopes() {
        using var factory = new WebApplicationFactory<webserver.Program>()
            .WithWebHostBuilder(builder => {
                builder.UseEnvironment("Testing");
                builder.ConfigureAppConfiguration((_, configuration) =>
                    configuration.AddInMemoryCollection(TestDatabaseRuntime.CreateConfiguration()));
            });

        using var firstScope = factory.Services.CreateScope();
        var first = firstScope.ServiceProvider.GetRequiredService<MoneyGestorContext>();
        var sameScope = firstScope.ServiceProvider.GetRequiredService<MoneyGestorContext>();
        using var secondScope = factory.Services.CreateScope();
        var second = secondScope.ServiceProvider.GetRequiredService<MoneyGestorContext>();

        Assert.Multiple(() => {
            Assert.That(sameScope, Is.SameAs(first));
            Assert.That(second, Is.Not.SameAs(first));
            Assert.That(
                firstScope.ServiceProvider.GetRequiredService<IOptions<webserver.DatabaseOptions>>().Value.Password,
                Is.Not.Empty);
        });
    }

    [Test]
    public async Task AuthenticatedMutationUsesOneContextForEverySave() {
        using var setupDatabase = TestDatabaseRuntime.CreateContext();
        var setupExecutor = new ExecutorManager(setupDatabase, Clock);
        var user = new UserSample();
        var token = await TestUtils.CreateAndLoginUser(setupExecutor, user);

        var interceptor = new ContextRecordingInterceptor();
        using var mutationDatabase = TestDatabaseRuntime.CreateContext(interceptor);
        var mutationExecutor = new ExecutorManager(mutationDatabase, Clock).WithToken(token);

        await mutationExecutor.Execute(new AddNewWalletCommand("single-context", 10, 1));

        Assert.Multiple(() => {
            Assert.That(interceptor.ContextIds, Has.Count.EqualTo(1));
            Assert.That(interceptor.ContextIds.Single(), Is.EqualTo(mutationDatabase.ContextId.InstanceId));
            Assert.That(interceptor.SaveCalls, Is.GreaterThanOrEqualTo(2),
                "Token refresh and the mutation must save through the same scoped context.");
        });
    }

    private sealed class ContextRecordingInterceptor : SaveChangesInterceptor {
        private readonly HashSet<Guid> contextIds = [];

        internal IReadOnlySet<Guid> ContextIds => contextIds;
        internal Int32 SaveCalls { get; private set; }

        public override ValueTask<InterceptionResult<Int32>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<Int32> result,
            CancellationToken cancellationToken = default) {
            if (eventData.Context != null) {
                contextIds.Add(eventData.Context.ContextId.InstanceId);
            }

            SaveCalls++;
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}
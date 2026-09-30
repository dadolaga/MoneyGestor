using database;
using database.Models;
using logic;
using logic.Commands.Wallets;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Diagnostics;
using TestProject.Base;
using TestProject.Infrastructure;
using webserver.Api.V1;

namespace TestProject.Performance;

[TestFixture]
internal sealed class DashboardAggregationPerformanceTest : DatabaseBase {
    private readonly List<UInt64> cleanupUsers = [];

    [TearDown]
    public async Task Cleanup() {
        foreach (var userId in cleanupUsers) {
            await CleanupDatasetAsync(userId);
        }
        cleanupUsers.Clear();
    }

    [Test]
    public async Task DashboardAggregationUsesSingleQueryAndPreservesResults() {
        var userId = await SeedDatasetAsync();
        cleanupUsers.Add(userId);
        var interceptor = new QueryCaptureInterceptor();
        await using var database = TestDatabaseRuntime.CreateContext(interceptor);
        var service = new ResourceQueryService(database);
        var query = new DashboardQuery {
            From = new DateOnly(2026, 9, 1),
            To = new DateOnly(2026, 9, 30)
        };

        for (var warmup = 0; warmup < 8; warmup++) {
            await service.GetDashboardAsync(userId, query, CancellationToken.None);
        }

        interceptor.Reset();
        var sample = await service.GetDashboardAsync(userId, query, CancellationToken.None);
        Assert.Multiple(() => {
            Assert.That(sample.Incoming, Is.EqualTo(1350m));
            Assert.That(sample.Expense, Is.EqualTo(-700m));
            Assert.That(sample.IncomingCategories.Single().Value, Is.EqualTo(1350m));
            Assert.That(sample.ExpenseCategories.Single().Value, Is.EqualTo(-700m));
            Assert.That(interceptor.Count, Is.EqualTo(1), "Optimized dashboard round-trips.");
        });

        var sql = interceptor.Sql.ToArray();
        interceptor.Reset();
        var elapsedMilliseconds = new Double[50];
        var allocatedBefore = GC.GetTotalAllocatedBytes(true);
        for (var index = 0; index < elapsedMilliseconds.Length; index++) {
            var started = Stopwatch.GetTimestamp();
            var response = await service.GetDashboardAsync(userId, query, CancellationToken.None);
            elapsedMilliseconds[index] = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
            Assert.That(response.Incoming, Is.EqualTo(1350m));
            Assert.That(response.Expense, Is.EqualTo(-700m));
        }
        var allocated = (GC.GetTotalAllocatedBytes(true) - allocatedBefore) / elapsedMilliseconds.Length;
        Array.Sort(elapsedMilliseconds);

        TestContext.Progress.WriteLine(
            $"PERF-51 dashboard optimized: provider=MySQL 8.4; rows=1000; warmup=8; samples=50; " +
            $"queriesPerRequest={interceptor.Count / elapsedMilliseconds.Length}; " +
            $"p50Ms={Percentile(elapsedMilliseconds, 0.50):F3}; " +
            $"p95Ms={Percentile(elapsedMilliseconds, 0.95):F3}; " +
            $"allocatedBytesPerRequestApprox={allocated}.");
        TestContext.Progress.WriteLine("Dashboard SQL:\n" + String.Join("\n---\n", sql));

    }

    [Test]
    public async Task CancellationDuringLockedMutationRollsBackAndContextCanBeReused() {
        UInt64 userId;
        UInt64 walletId;
        await using (var seed = TestDatabaseRuntime.CreateContext()) {
            var user = new UserDb {
                Firstname = "Cancel",
                Lastname = "Perf",
                Email = $"cancel-{Guid.NewGuid():N}@test.invalid",
                Username = $"cancel-{Guid.NewGuid():N}",
                Password = "test-only"
            };
            seed.Users.Add(user);
            await seed.SaveChangesAsync();
            userId = user.Id;
            cleanupUsers.Add(userId);

            var wallet = new WalletDb {
                Name = "Cancellation wallet",
                Value = 10m,
                CurrentValue = 10m,
                ColorId = 1,
                UserId = userId
            };
            seed.Wallets.Add(wallet);
            await seed.SaveChangesAsync();
            walletId = wallet.Id;
        }

        using var cancellation = new CancellationTokenSource();
        var interceptor = new CancelFirstReaderInterceptor(cancellation);
        await using var database = TestDatabaseRuntime.CreateContext(interceptor);
        var executor = new ExecutorManager(database, TimeProvider.System).UseAuthenticatedUser(userId);
        Assert.CatchAsync<OperationCanceledException>(async () =>
            await executor.Execute(new UpdateWalletCurrentValueCommand(walletId, 99m), cancellation.Token));
        Assert.That(interceptor.CanceledCommand, Is.True);
        Assert.Throws<ExecutorException>(() => _ = executor.Transaction);

        await executor.Execute(new UpdateWalletCurrentValueCommand(walletId, 25m));
        await using var verification = TestDatabaseRuntime.CreateContext();
        var storedWallet = await verification.Wallets.SingleAsync(wallet => wallet.Id == walletId);
        Assert.That(storedWallet.CurrentValue, Is.EqualTo(25m));
    }

    private static async Task<UInt64> SeedDatasetAsync() {
        await using var database = TestDatabaseRuntime.CreateContext();
        var user = new UserDb {
            Firstname = "Perf",
            Lastname = "Baseline",
            Email = $"perf-{Guid.NewGuid():N}@test.invalid",
            Username = $"perf-{Guid.NewGuid():N}",
            Password = "test-only"
        };
        database.Users.Add(user);
        await database.SaveChangesAsync();

        var incomeType = new TransactionTypeDb { Name = "Perf income", UserId = user.Id };
        var expenseType = new TransactionTypeDb { Name = "Perf expense", UserId = user.Id };
        database.TransactionTypes.AddRange(incomeType, expenseType);
        var wallet = new WalletDb {
            Name = "Perf wallet",
            Value = 650m,
            CurrentValue = 650m,
            ColorId = 1,
            UserId = user.Id
        };
        database.Wallets.Add(wallet);
        await database.SaveChangesAsync();

        database.Transactions.AddRange(Enumerable.Range(0, 1000).Select(index => {
            var incoming = index < 600;
            return new TransactionDb {
                Description = $"baseline-{index:D4}",
                Date = new DateOnly(2026, 9, 15),
                TransactionTypeId = incoming ? incomeType.Id : expenseType.Id,
                UserId = user.Id,
                UserInsertId = user.Id,
                WalletId = wallet.Id,
                Value = incoming ? 2.25m : -1.75m
            };
        }));
        await database.SaveChangesAsync();
        return user.Id;
    }

    private static async Task CleanupDatasetAsync(UInt64 userId) {
        await using var database = TestDatabaseRuntime.CreateContext();
        await database.Transactions.Where(row => row.UserId == userId).ExecuteDeleteAsync();
        await database.Wallets.Where(row => row.UserId == userId).ExecuteDeleteAsync();
        await database.TransactionTypes.Where(row => row.UserId == userId).ExecuteDeleteAsync();
        await database.Users.Where(row => row.Id == userId).ExecuteDeleteAsync();
    }

    private static Double Percentile(Double[] sorted, Double percentile) =>
        sorted[(Int32)Math.Ceiling(percentile * sorted.Length) - 1];

    private sealed class CancelFirstReaderInterceptor(CancellationTokenSource cancellation) : DbCommandInterceptor {
        private Int32 canceled;
        internal Boolean CanceledCommand => Volatile.Read(ref canceled) == 1;

        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default) {
            if (Interlocked.Exchange(ref canceled, 1) == 0) {
                cancellation.Cancel();
                await Task.Delay(Timeout.Infinite, cancellation.Token);
            }
            return result;
        }
    }

    private sealed class QueryCaptureInterceptor : DbCommandInterceptor {
        private readonly List<String> sql = [];
        internal IReadOnlyList<String> Sql => sql;
        internal Int32 Count => sql.Count;

        internal void Reset() => sql.Clear();

        private void Capture(DbCommand command) => sql.Add(command.CommandText);

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default) {
            Capture(command);
            return ValueTask.FromResult(result);
        }

        public override ValueTask<InterceptionResult<Object>> ScalarExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<Object> result,
            CancellationToken cancellationToken = default) {
            Capture(command);
            return ValueTask.FromResult(result);
        }
    }
}

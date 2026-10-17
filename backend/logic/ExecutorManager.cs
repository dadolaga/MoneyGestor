using database;
using logic.Commands;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace logic;

public sealed class ExecutorManager(
    IDbContextFactory<MoneyGestorContext> contextFactory,
    TimeProvider timeProvider,
    ILogger<ExecutorManager> logger) {
    private const Int32 MaxAttempts = 5;
    private UInt64? userId;
    private MoneyGestorContext? dbContext;

    public UInt64 UserId => userId ?? throw new ExecutorException("No command is executing.");
    public MoneyGestorContext DbContext => dbContext ?? throw new ExecutorException("No command is executing.");

    /// <summary>The owner must come from the authenticated principal, never from request data.</summary>
    public async Task<T> ExecuteAsync<T>(UInt64 authenticatedUserId, ICommand<T> command, CancellationToken cancellationToken = default) {
        ArgumentNullException.ThrowIfNull(command);
        ArgumentOutOfRangeException.ThrowIfZero(authenticatedUserId);
        if (userId != null) {
            throw new ExecutorException("An operation is already executing. Nested commands must use the active executor directly.");
        }

        userId = authenticatedUserId;
        try {
            for (var attempt = 1; ; attempt++) {
                try {
                    return await ExecuteAttemptAsync(command, cancellationToken);
                } catch (Exception exception) when (attempt < MaxAttempts && DatabaseUpdatePolicy.IsRetryable(exception)) {
                    ConcurrencyRetryMetrics.RecordRetry();
                    logger.LogWarning(new EventId(1301, "ConcurrencyRetry"),
                        "Retrying a concurrent write (Attempt {Attempt})", attempt + 1);
                    await Task.Delay(TimeSpan.FromMilliseconds(10 * attempt), timeProvider, cancellationToken);
                }
            }
        } finally {
            userId = null;
        }
    }

    private async Task<T> ExecuteAttemptAsync<T>(ICommand<T> command, CancellationToken cancellationToken) {
        // Each attempt owns a fresh context, including consecutive operations on this scoped executor.
        await using var database = await contextFactory.CreateDbContextAsync(cancellationToken);
        dbContext = database;
        try {
            await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
            try {
                var result = await command.ExecuteAsync(this, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return result;
            } catch {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        } finally {
            dbContext = null;
        }
    }
}

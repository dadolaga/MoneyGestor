using database;
using logic.Commands;
using logic.Commands.User;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore.Storage;
using logic.Security;
using Microsoft.Extensions.Logging;

namespace logic {
    public class ExecutorManager {
        private const Int32 MaxAttempts = 5;
        public String? Token { get; private set; }
        public UInt64 UserId => userId ?? throw new ExecutorException("User not already logged");
        public MoneyGestorContext DbContext { get; private set; }
        public IDbContextTransaction Transaction => transaction == null ? throw new ExecutorException("Transaction was not open or already closed") : transaction!;

        private IDbContextTransaction? transaction;

        private UInt64? userId;
        private readonly MoneyGestorContext primaryDbContext;
        private readonly Func<MoneyGestorContext>? contextFactory;
        private readonly ILogger<ExecutorManager>? logger;

        internal TimeProvider TimeProvider { get; }

        public ExecutorManager(MoneyGestorContext dbContext, TimeProvider timeProvider)
            : this(dbContext, timeProvider, null) {
        }

        public ExecutorManager(
            MoneyGestorContext dbContext,
            TimeProvider timeProvider,
            Func<MoneyGestorContext>? contextFactory,
            ILogger<ExecutorManager>? logger = null) {
            DbContext = dbContext;
            primaryDbContext = dbContext;
            this.contextFactory = contextFactory;
            this.logger = logger;
            TimeProvider = timeProvider;
            transaction = null;
        }

        public ExecutorManager WithToken(String? token) {
            Token = token;
            return this;
        }

        /// <summary>Supplies a user ID resolved by the authenticated application boundary, without accepting client identity data.</summary>
        public ExecutorManager UseAuthenticatedUser(UInt64 authenticatedUserId) {
            if (Token != null || userId != null || authenticatedUserId == 0) {
                throw new InvalidOperationException("An authenticated user can only be assigned to a fresh executor.");
            }
            userId = authenticatedUserId;
            return this;
        }

        public async Task Execute<T>(ICommand<T> executor) {
            if (transaction != null) {
                throw new ExecutorException("Transaction already started");
            }

            for (var attempt = 1; attempt <= MaxAttempts; attempt++) {
                MoneyGestorContext? retryContext = null;
                if (attempt > 1) {
                    retryContext = contextFactory?.Invoke()
                        ?? throw new InvalidOperationException(
                            "A fresh database context factory is required to retry a concurrent operation.");
                    DbContext = retryContext;
                }

                try {
                    transaction = await DbContext.Database.BeginTransactionAsync();
                    await LoginUser();
                    await executor.Execute(this);
                    await transaction.CommitAsync();
                    return;
                } catch (Exception exception) {
                    if (transaction != null) {
                        await transaction.RollbackAsync();
                    }

                    if (attempt == MaxAttempts || !DatabaseUpdatePolicy.IsRetryable(exception)) {
                        throw;
                    }
                    ConcurrencyRetryMetrics.RecordRetry();
                    logger?.LogWarning(new EventId(1301, "ConcurrencyRetry"),
                        "Retrying a concurrent write (Attempt {Attempt})", attempt + 1);
                    await Task.Delay(TimeSpan.FromMilliseconds(10 * attempt));
                } finally {
                    if (transaction != null) {
                        await transaction.DisposeAsync();
                        transaction = null;
                    }
                    if (retryContext != null) {
                        await retryContext.DisposeAsync();
                    }
                    DbContext = primaryDbContext;
                }
            }
        }

        public void SetToken(String token) {
            if (Token != null) {
                throw new InvalidOperationException("Token is already set");
            }

            Token = token;
        }

        public void CheckUserLogged() {
            if (userId == null) {
                throw new ExecutorException("User or token not setted");
            }
        }

        public async Task<Boolean> LoginUser() {
            if (Token == null) {
                return false;
            }

            if (userId != null) {
                return true;
            }

            var findUserCommand = new FindUserByTokenCommand();

            await findUserCommand.Execute(this);

            userId = findUserCommand.Result;

            return true;
        }
    }
}

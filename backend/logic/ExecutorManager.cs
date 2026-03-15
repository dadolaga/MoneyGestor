using database;
using logic.Commands;
using logic.Commands.User;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore.Storage;

namespace logic {
    public class ExecutorManager {
        public String? Token { get; private set; }
        public UInt64 UserId => userId ?? throw new ExecutorException("User not already logged");
        public MoneyGestorContext DbContext { get; private set; }
        public IDbContextTransaction Transaction => transaction == null ? throw new ExecutorException("Transaction was not open or already closed") : transaction!;

        private IDbContextTransaction? transaction;

        private UInt64? userId;

        public ExecutorManager(String? token = null) {
            Token = token;
            DbContext = new MoneyGestorContext();
            transaction = null;
        }

        ~ExecutorManager() {
            if (transaction != null) {
                throw new ExecutorException("Try to destroy an execution manager when not commit or rollback edits");
            }
        }

        public async Task Execute<T>(ICommand<T> executor) {
            if (transaction != null) {
                throw new ExecutorException("Transaction already started");
            }

            transaction = await DbContext.Database.BeginTransactionAsync();

            try {
                await LoginUser();

                await executor.Execute(this);

                await transaction.CommitAsync();
            } catch (Exception ex) {
                await transaction.RollbackAsync();
                throw;
            } finally {
                transaction.Dispose();

                transaction = null;
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
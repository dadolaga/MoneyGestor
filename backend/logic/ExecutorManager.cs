using database;
using logic.Exceptions;
using logic.Commands;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic {
    public class ExecutorManager {
        public string? Token { get; private set; }
        public MoneyGestorContext DbContext { get; private set; }
        public IDbContextTransaction Transaction {
            get {
                if (transaction == null)
                    throw new ExecutorException("Transaction was not open or already closed");

                return transaction!;
            }
        }

        private IDbContextTransaction? transaction;

        public ExecutorManager(string? token = null) {
            Token = token;
            DbContext = new MoneyGestorContext();
            transaction = null;
        }

        ~ExecutorManager() {
            if(transaction != null) 
                throw new ExecutorException("Try to destroy an execution manager when not commit or rollback edits");
        }

        public async Task Execute<T>(ICommand<T> executor) {
            transaction = await DbContext.Database.BeginTransactionAsync();

            try {
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

        public void SetToken(string token) {
            if (Token != null) {
                throw new InvalidOperationException("Token is already set");
            }

            Token = token;
        }
    }
}

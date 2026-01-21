using database;
using logic.Executors;
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

        public ExecutorManager(string? token = null) {
            Token = token;
            DbContext = new MoneyGestorContext();
        }

        public async Task Execute<T>(IExecutor<T> executor) {
            var transaction = await DbContext.Database.BeginTransactionAsync();

            try {
                await executor.Execute(this);

                await transaction.CommitAsync();
            } catch (Exception ex) {
                await transaction.RollbackAsync();
                throw;
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

using MySqlX.XDevAPI.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands {
    public abstract class ICommand<T> {
        protected T? result;
        public T Result => result == null ? throw new InvalidOperationException("Executor not ended") : result!;

        internal abstract Task Execute(ExecutorManager executorManager);
    }
}
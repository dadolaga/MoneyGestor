using MySqlX.XDevAPI.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands {
    public abstract class ICommand<T> {
        public T? result { get; set; }

        internal abstract Task Execute(ExecutorManager executorManager);

        public T GetResult() {
            if (result == null) {
                throw new InvalidOperationException("Executor not ended");
            }

            return result;
        }
    }
}

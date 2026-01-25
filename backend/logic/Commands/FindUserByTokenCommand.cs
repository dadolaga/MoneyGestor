using logic.Models;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands
{
    public class FindUserByTokenCommand : ICommand<UInt64>
    {
        internal override Task Execute(ExecutorManager executorManager)
        {
            throw new NotImplementedException();
        }
    }
}

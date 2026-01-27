using logic.Clock;
using logic.Exceptions;
using logic.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands.User {
    public class FindUserByTokenCommand : ICommand<UInt64> {

        internal override async Task Execute(ExecutorManager executorManager) {
            if (executorManager.Token is null) {
                throw new ExecutorException("Token is null");
            }

            using var database = DatabaseFactory.Use();

            var login = await database.Logins.Where(l => l.Token == executorManager.Token).Include(l => l.User).FirstOrDefaultAsync() ?? throw new ExecutorException($"User not found, with token {executorManager.Token}");

            result = login.Expirated < ClockFactory.Clock().Now ? throw new TokenExpiatedException("Token is expirated") : login.User.Id;

            login.Expirated = ClockFactory.Clock().Now.Add(login.IsLong ? LoginCommand.EXPIRATED_LONG : LoginCommand.EXPIRATED_SMALL);

            await database.SaveChangesAsync();
        }
    }
}
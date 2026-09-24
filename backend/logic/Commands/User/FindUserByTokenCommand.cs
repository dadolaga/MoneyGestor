using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Commands.User {
    public class FindUserByTokenCommand : ICommand<UInt64> {
        internal override async Task Execute(ExecutorManager executorManager) {
            if (executorManager.Token is null) {
                throw new ExecutorException("Token is null");
            }

            var database = executorManager.DbContext;
            var login = await database.Logins
                .Where(item => item.Token == executorManager.Token)
                .FirstOrDefaultAsync()
                ?? throw new ExecutorException("User not found for the supplied authentication token");

            var now = executorManager.TimeProvider.GetLocalNow().DateTime;
            result = login.Expirated < now
                ? throw new TokenExpiatedException("Token is expirated")
                : login.UserId;
            login.Expirated = now.Add(login.IsLong
                ? LoginCommand.EXPIRATED_LONG
                : LoginCommand.EXPIRATED_SMALL);

            await database.SaveChangesAsync();
        }
    }
}

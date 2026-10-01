using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace logic.Commands.User {
    public class LoginCommand : ICommand<String> {
        private static readonly UInt32 TOKEN_LENGTH = 16;
        public static readonly TimeSpan EXPIRATED_SMALL = TimeSpan.FromHours(2);
        public static readonly TimeSpan EXPIRATED_LONG = TimeSpan.FromDays(30);

        private readonly String userOrEmail;
        private readonly String password;
        private readonly Boolean remember;

        public LoginCommand(String userOrEmail, String password, Boolean remember = false) {
            this.userOrEmail = userOrEmail;
            this.password = password;
            this.remember = remember;
        }

        internal override async Task Execute(ExecutorManager executorManager, CancellationToken cancellationToken) {
            var database = executorManager.DbContext;
            var user = await database.Users
                .FirstOrDefaultAsync(item => item.Username == userOrEmail || item.Email == userOrEmail, cancellationToken)
                ?? throw new ObjectNotFoundException("User not found");

            if (!PasswordHasher.Verify(password, user.Password)) {
                throw new ObjectNotFoundException("Password not is correct");
            }

            var login = new LoginDb {
                Token = TokenGenerator.GenerateRandomBase64Token(TOKEN_LENGTH),
                Expirated = executorManager.TimeProvider.GetUtcNow().UtcDateTime.Add(
                    remember ? EXPIRATED_LONG : EXPIRATED_SMALL),
                IsLong = remember,
                UserId = user.Id
            };

            await database.AddAsync(login, cancellationToken);
            await database.SaveChangesAsync(cancellationToken);
            result = login.Token;
        }
    }
}
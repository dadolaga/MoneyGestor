using database.Models;
using logic.Clock;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Commands {
    public class LoginCommand : ICommand<string> {
        private static readonly uint TOKEN_LENGTH = 16;
        private static readonly TimeSpan EXPIRATED_SMALL = TimeSpan.FromHours(2);
        private static readonly TimeSpan EXPIRATED_LONG = TimeSpan.FromDays(30); // 1 month

        private string userOrEmail;
        private string password;
        private bool remember;

        public LoginCommand(string userOrEmail, string password, bool remember = false) {
            this.userOrEmail = userOrEmail;
            this.password = password;
            this.remember = remember;
        }

        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var user = await database.Users.FirstOrDefaultAsync(u => u.Username == userOrEmail || u.Email == userOrEmail);

            if (user == null) {
                throw new ObjectNotFoundException("User not found");
            }

            if (!PasswordHasher.Verify(password, user.Password)) {
                throw new ObjectNotFoundException("Password not is correct");
            }

            LoginDb login = new LoginDb {
                Token = TokenGenerator.GenerateRandomBase64Token(TOKEN_LENGTH),
                Expirated = ClockFactory.Clock().Now.Add(remember ? EXPIRATED_LONG : EXPIRATED_SMALL),
                UserId = user.Id
            };

            await database.AddAsync(login);

            await database.SaveChangesAsync();

            result = login.Token;
        }
    }
}

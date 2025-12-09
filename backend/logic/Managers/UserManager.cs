using database;
using database.Models;
using logic.Clock;
using logic.Exceptions;
using logic.Models;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices.Marshalling;

namespace logic.Managers
{
    public class UserManager
    {
        static readonly ushort TOKEN_LENGTH = 64;
        static readonly TimeSpan EXPIRATED_SMALL = TimeSpan.FromHours(2);

        public static async Task<ulong> AddNewUser(string firstname, string lastname, string username, string email, string password)
        {
            if (firstname == null || lastname == null || username == null || email == null || password == null)
            {
                throw new MandatoryParamException("All data must be passed");
            }

            using var database = DatabaseFactory.Create();

            var userDb = new UserDb
            {
                Firstname = firstname,
                Lastname = lastname,
                Username = username,
                Email = email,
                Password = PasswordHasher.Hash(password)
            };

            if (database.Users.FirstOrDefault(u => u.Username == username || u.Email == email) != null)
            {
                throw new DuplicateObjectException();
            }

            await database.AddAsync(userDb);

            await database.SaveChangesAsync();

            return userDb.Id;
        }

        public static async Task<string> Login(string username_email, string password)
        {
            using var database = DatabaseFactory.Create();

            var user = await database.Users.FirstOrDefaultAsync(u => u.Username == username_email || u.Email == username_email);

            if (user == null)
            {
                throw new ObjectNotFoundException("User not found");
            }

            if (!PasswordHasher.Verify(password, user.Password))
            {
                throw new ObjectNotFoundException("Password not is correct");
            }

            LoginDb login = new LoginDb
            {
                Token = TokenGenerator.GenerateRandomBase64Token(TOKEN_LENGTH),
                Expirated = ClockFactory.Clock().Now.Add(EXPIRATED_SMALL),
                UserId = user.Id
            };

            await database.AddAsync(login);

            await database.SaveChangesAsync();

            return login.Token;
        }

        public static async Task<User> FindToken(string token)
        {
            using var database = DatabaseFactory.Create();

            return await FindToken(token, database);
        }

        private static async Task<User> FindToken(string token, MoneyGestorContext database) {
            var login = await database.Logins.Where(l => l.Token == token).Include(l => l.User).FirstOrDefaultAsync();

            if (login == null) {
                throw new ObjectNotFoundException("Token not found");
            }

            if (login.Expirated.CompareTo(ClockFactory.Clock().Now) < 0) {
                throw new TokenExpiatedException("Token was expiated");
            }

            return login.User.Convert();
        }


        public static async Task<User> FindTokenAndUpdate(string token) {
            using var database = DatabaseFactory.Create();

            var user = await FindToken(token, database);

            var login = await database.Logins.FirstAsync(l => l.Token == token);

            login.Expirated = ClockFactory.Clock().Now.Add(EXPIRATED_SMALL);

            database.Update(login);

            await database.SaveChangesAsync();

            return user;
        }
    }
}

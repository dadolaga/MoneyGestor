using database.Models;
using logic.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices.Marshalling;

namespace logic {
    public class UserManager {

        public static async Task<UInt64> AddNewUser(string firstname, string lastname, string username, string email, string password) {
            using var database = DatabaseFactory.Create();

            var userDb = new UserDb {
                Firstname = firstname,
                Lastname = lastname,
                Username = username,
                Email = email,
                Password = password
            };

            if (database.Users.FirstOrDefault(u => u.Username == username || u.Email == email) != null) {
                throw new DuplicateObjectException();
            }

            await database.AddAsync(userDb);

            await database.SaveChangesAsync();

            return userDb.Id;
        }
    }
}

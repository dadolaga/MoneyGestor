using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    internal static class Converter {
        public static User Convert(this UserDb userDb) {
            return new User {
                Id = userDb.Id,
                Firstname = userDb.Firstname,
                Lastname = userDb.Lastname,
                Username = userDb.Username,
                Email = userDb.Email
            };
        }
    }
}

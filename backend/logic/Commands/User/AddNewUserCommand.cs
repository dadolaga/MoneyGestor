using database.Models;
using logic.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;

namespace logic.Commands.User {
    public class AddNewUserCommand : ICommand<UInt64> {
        private readonly String firstname_;
        private readonly String lastname_;
        private readonly String username_;
        private readonly String email_;
        private readonly String password_;

        public AddNewUserCommand(String firstname, String lastname, String username, String email, String password) {
            if (firstname == null || lastname == null || username == null || email == null || password == null) {
                throw new MandatoryParamException("All data must be passed");
            }

            firstname_ = firstname;
            lastname_ = lastname;
            username_ = username;
            email_ = email;
            password_ = password;
        }
        internal override async Task Execute(ExecutorManager executorManager) {
            var database = executorManager.DbContext;

            var userDb = new UserDb {
                Firstname = firstname_,
                Lastname = lastname_,
                Username = username_,
                Email = email_,
                Password = PasswordHasher.Hash(password_)
            };

            if (database.Users.FirstOrDefault(u => u.Username == username_ || u.Email == email_) != null) {
                throw new DuplicateObjectException();
            }

            await database.AddAsync(userDb);

            await database.SaveChangesAsync();

            result = userDb.Id;
        }
    }
}
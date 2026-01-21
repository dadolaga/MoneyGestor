using database.Models;
using logic.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Executors {
    public class AddNewUserExecutor : IExecutor<UInt64> {
        private string firstname_;
        private string lastname_;
        private string username_;
        private string email_;
        private string password_;

        public AddNewUserExecutor(string firstname, string lastname, string username, string email, string password) {
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

            result_ = userDb.Id;
        }
    }
}

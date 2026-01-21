using logic.Executors;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class UserSample {
        private const string DefaultUsername = "TestTest";
        private const string DefaultFirstName = "Test";
        private const string DefaultLastName = "Test";
        private const string DefaultEmail = "test@test.me";
        private const string DefaultPassword = "Password123!";

        private AddNewUserExecutor? addNewUserExecutor;

        public string Username { get; private set; }
        public string FirstName { get; private set; }
        public string LastName { get; private set; }
        public string Email { get; private set; }
        public string Password { get; private set; }

        public AddNewUserExecutor AddNewUserExecutor {
            get {
                if (addNewUserExecutor == null) {
                    addNewUserExecutor = new AddNewUserExecutor(FirstName, LastName, Username, Email, Password);
                }

                return addNewUserExecutor;
            }
        }

        public UserSample(string username = DefaultUsername,
                string firstName = DefaultFirstName,
                string lastName = DefaultLastName,
                string email = DefaultEmail,
                string password = DefaultPassword) {
            Username = username;
            FirstName = firstName;
            LastName = lastName;
            Email = email;
            Password = password;
        }
    }
}

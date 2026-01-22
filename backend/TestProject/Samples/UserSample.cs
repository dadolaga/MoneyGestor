using logic.Commands;
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

        private AddNewUserCommand? addNewUserCommand;

        public string Username { get; private set; }
        public string FirstName { get; private set; }
        public string LastName { get; private set; }
        public string Email { get; private set; }
        public string Password { get; private set; }

        public AddNewUserCommand AddNewUserExecutor {
            get {
                if (addNewUserCommand == null) {
                    addNewUserCommand = new AddNewUserCommand(FirstName, LastName, Username, Email, Password);
                }

                return addNewUserCommand;
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

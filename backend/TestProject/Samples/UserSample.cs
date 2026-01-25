using logic.Commands;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class UserSample {
        private const String DefaultUsername = "TestTest";
        private const String DefaultFirstName = "Test";
        private const String DefaultLastName = "Test";
        private const String DefaultEmail = "test@test.me";
        private const String DefaultPassword = "Password123!";

        private AddNewUserCommand? addNewUserCommand;

        public String Username { get; private set; }
        public String FirstName { get; private set; }
        public String LastName { get; private set; }
        public String Email { get; private set; }
        public String Password { get; private set; }

        public AddNewUserCommand AddNewUserExecutor {
            get {
                addNewUserCommand ??= new AddNewUserCommand(FirstName, LastName, Username, Email, Password);

                return addNewUserCommand;
            }
        }

        public UserSample(String username = DefaultUsername,
                String firstName = DefaultFirstName,
                String lastName = DefaultLastName,
                String email = DefaultEmail,
                String password = DefaultPassword) {
            Username = username;
            FirstName = firstName;
            LastName = lastName;
            Email = email;
            Password = password;
        }
    }
}
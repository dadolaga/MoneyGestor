using logic.Commands;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class UserSample {
        private const String DEFAULT_USERNAME = "TestTest";
        private const String DEFAULT_FIRST_NAME = "Test";
        private const String DEFAULT_LAST_NAME = "Test";
        private const String DEFAULT_EMAIL = "test@test.me";
        private const String DEFAULT_PASSWORD = "Password123!";

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

        public UserSample(String username = DEFAULT_USERNAME,
                String firstName = DEFAULT_FIRST_NAME,
                String lastName = DEFAULT_LAST_NAME,
                String email = DEFAULT_EMAIL,
                String password = DEFAULT_PASSWORD) {
            Username = username;
            FirstName = firstName;
            LastName = lastName;
            Email = email;
            Password = password;
        }
    }
}
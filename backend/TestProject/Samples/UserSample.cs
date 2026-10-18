using logic.Commands.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class UserSample(String username = UserSample.DEFAULT_USERNAME,
            String firstName = UserSample.DEFAULT_FIRST_NAME,
            String lastName = UserSample.DEFAULT_LAST_NAME,
            String email = UserSample.DEFAULT_EMAIL,
            String password = UserSample.DEFAULT_PASSWORD) {
        private const String DEFAULT_USERNAME = "TestTest";
        private const String DEFAULT_FIRST_NAME = "Test";
        private const String DEFAULT_LAST_NAME = "Test";
        private const String DEFAULT_EMAIL = "test@test.me";
        private const String DEFAULT_PASSWORD = "Password123!";

        private AddNewUserCommand? addNewUserCommand;

        public String Username { get; private set; } = username;
        public String FirstName { get; private set; } = firstName;
        public String LastName { get; private set; } = lastName;
        public String Email { get; private set; } = email;
        public String Password { get; private set; } = password;

        public AddNewUserCommand AddNewUserExecutor {
            get {
                addNewUserCommand ??= new AddNewUserCommand(FirstName, LastName, Username, Email, Password);

                return addNewUserCommand;
            }
        }
    }
}
using logic.Commands;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class LoginSample {
        public UserSample UserSample { get; private set; }

        public LoginCommand LoginCommand { get; private init; }

        public LoginSample(UserSample userSample) {
            UserSample = userSample;

            LoginCommand = new LoginCommand(UserSample.Email, UserSample.Password);
        }
    }
}
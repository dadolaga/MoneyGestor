using logic;
using logic.Commands.User;
using logic.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Samples;

namespace TestProject.Utils {
    internal class TestUtils {
        public static async Task<String> CreateAndLoginUser(ExecutorManager executor, UserSample user) {
            await executor.Execute(user.AddNewUserExecutor);

            var loginCommand = new LoginCommand(user.Email, user.Password);

            await executor.Execute(loginCommand);

            executor.SetToken(loginCommand.Result);

            return loginCommand.Result;
        }

        public static async Task<ExecutorManager> CreateExecutorManagerForUser(UserSample user) {
            var executorManager = new ExecutorManager();

            await CreateAndLoginUser(executorManager, user);

            return executorManager;
        }

    }
}

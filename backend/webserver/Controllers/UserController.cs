using logic;
using logic.Commands.User;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Models;

namespace webserver.Controllers {
    [ApiController]
    [Route("user")]
    [EnableCors("CorsPolicy")]
    public class UserController : MoneyMenagerController {

        [HttpPost("add")]
        public async Task<IActionResult> Add([FromBody] User user) {
            var executor = new ExecutorManager();

            var addNewUserCommand = new AddNewUserCommand(
                firstname: user.Firstname,
                lastname: user.Lastname,
                username: user.Username,
                email: user.Email,
                password: user.Password!);

            try {
                await executor.Execute(addNewUserCommand);

                return CreateResponse(addNewUserCommand.Result, "user");
            } catch (DuplicateObjectException ex) {
                if (ex.Message.Contains("username", StringComparison.InvariantCultureIgnoreCase)) {
                    return ErrorResponse(101, "Duplicate username");
                } else if (ex.Message.Contains("email", StringComparison.InvariantCultureIgnoreCase)) {
                    return ErrorResponse(102, "Duplicate email");
                }

                throw;
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Login login) {
            var executor = new ExecutorManager();

            var loginCommand = new LoginCommand(login.User, login.Password, login.Remember.GetValueOrDefault(false));

            try {
                await executor.Execute(loginCommand);

                return LoginResponse(loginCommand.Result);
            } catch (ObjectNotFoundException ex) {
                return ErrorResponse(111, "Login fail");
            }
        }

        private IActionResult LoginResponse(String token) => OkReponse(token, "Login correct");
    }
}

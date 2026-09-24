using database;
using logic;
using logic.Commands.User;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webserver.Models;
using webserver.Auth;
using database.Models;
using System.Security.Cryptography;

namespace webserver.Controllers {
    [ApiController]
    [Route("user")]
    [EnableCors("CorsPolicy")]
    public class UserController(AccountService accounts) : MoneyMenagerController {

        [HttpPost("add")]
        public async Task<IActionResult> Add([FromBody] User user) {
            try {
                await accounts.RegisterAsync(new RegisterAccountRequest(
                    user.Firstname,
                    user.Lastname,
                    user.Username,
                    user.Email,
                    user.Password!), HttpContext.RequestAborted);
                var id = await accounts.GetLegacyUserIdAsync(user.Username);
                return CreateResponse(id ?? 0, "user");
            } catch (AccountValidationException) {
                return ErrorResponse(103, "Account validation failed");
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] Login login) {
            var result = await accounts.LoginAsync(
                new LoginAccountRequest(login.User, login.Password, login.Remember.GetValueOrDefault(false)),
                issueCookie: false,
                HttpContext.RequestAborted);
            if (result != AccountLoginStatus.Succeeded) {
                return ErrorResponse(111, "Login fail");
            }

            var userId = await accounts.GetLegacyUserIdAsync(login.User);
            if (userId == null) {
                return ErrorResponse(111, "Login fail");
            }

            using var database = DatabaseFactory.Use();
            var rawLogin = new LoginDb {
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16)),
                Expirated = DateTime.Now.Add(login.Remember.GetValueOrDefault(false)
                    ? LoginCommand.EXPIRATED_LONG
                    : LoginCommand.EXPIRATED_SMALL),
                IsLong = login.Remember.GetValueOrDefault(false),
                UserId = userId.Value
            };
            database.Logins.Add(rawLogin);
            await database.SaveChangesAsync();
            return LoginResponse(rawLogin.Token);
        }

        [HttpGet("info")]
        public async Task<IActionResult> Info([FromHeader(Name = "Authorization")] String? authorization) {
            var executor = new ExecutorManager(authorization);

            var findCommand = new FindUserByTokenCommand();

            try {
                await executor.Execute(findCommand);

                using var database = DatabaseFactory.Use();

                var user = await database.Users.FirstAsync(u => u.Id == findCommand.Result);

                user.Password = "";

                return OkResponse(user, "User information");
            } catch (ExecutorException ex) {
                return ErrorResponse(121, "User not found or token exirated");
            }
        }

        private IActionResult LoginResponse(String token) => OkResponse(token, "Login correct");
    }
}

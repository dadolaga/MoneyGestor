using logic;
using logic.Commands.User;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace webserver.Controllers {

    [ApiController]
    [Route("color")]
    [EnableCors("CorsPolicy")]
    public class ColorController : MoneyMenagerController {

        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String? authorization) {
            var executor = new ExecutorManager(authorization);

            var findUserComand = new FindUserByTokenCommand();

            await executor.Execute(findUserComand);

            using var database = DatabaseFactory.Use();

            var colorList = database
                .Colors
                .Where(c => c.UserId == null || c.UserId == findUserComand.Result)
                .ToList()
                .Select(c => new Color {
                    Id = c.Id,
                    Name = c.Name,
                    Value = c.Value,
                    UserId = c.UserId
                });

            return OkReponse(colorList, "Color list");
        }
    }
}
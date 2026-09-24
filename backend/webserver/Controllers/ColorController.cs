using logic;
using logic.Commands.User;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace webserver.Controllers {

    [ApiController]
    [Route("color")]
    [EnableCors("CorsPolicy")]
    public class ColorController(ExecutorManager executor, database.MoneyGestorContext database) : MoneyMenagerController {

        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String? authorization) {
            executor.SetToken(authorization!);
            await executor.LoginUser();

            var colorList = database
                .Colors
                .Where(c => c.UserId == null || c.UserId == executor.UserId)
                .ToList()
                .Select(c => new Color {
                    Id = c.Id,
                    Name = c.Name,
                    Value = c.Value,
                    UserId = c.UserId
                });

            return OkResponse(colorList, "Color list");
        }
    }
}

using logic;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace webserver.Controllers {
    [ApiController]
    [Route("type")]
    [EnableCors("CorsPolicy")]
    public class TypeController : MoneyMenagerController {
        [HttpGet()]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var typeList = await database.TransactionTypes.Where(tt => tt.UserId == null || tt.UserId == executor.UserId).ToListAsync();

            return OkResponse(typeList.Select(tt => tt.Convert()), "List of transaction type");
        }
    }
}

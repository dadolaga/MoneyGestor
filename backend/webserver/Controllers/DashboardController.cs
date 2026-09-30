using logic;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;

namespace webserver.Controllers {
    [ApiController]
    [Route("dashboard")]
    [EnableCors("CorsPolicy")]
    public class DashboardController(ExecutorManager executor, IResourceQueryService queries) : MoneyMenagerController {
        [HttpGet("all")]
        public async Task<IActionResult> All(
            [FromHeader(Name = "Authorization")] String authorization,
            [FromQuery(Name = "from")] DateTimeOffset from,
            [FromQuery(Name = "to")] DateTimeOffset to) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var result = await queries.GetDashboardAsync(executor.UserId, new DashboardQuery {
                From = DateOnly.FromDateTime(from.DateTime),
                To = DateOnly.FromDateTime(to.DateTime)
            }, HttpContext.RequestAborted);
            return OkResponse(LegacyResourceMapper.ToLegacy(result, executor.UserId));
        }
    }
}

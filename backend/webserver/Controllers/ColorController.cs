using logic;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;

namespace webserver.Controllers {
    [ApiController]
    [Route("color")]
    [EnableCors("CorsPolicy")]
    public class ColorController(ExecutorManager executor, IResourceQueryService queries) : MoneyManagerController {
        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var colors = await queries.GetLegacyColorsAsync(executor.UserId, HttpContext.RequestAborted);
            return OkResponse(colors, "Color list");
        }
    }
}

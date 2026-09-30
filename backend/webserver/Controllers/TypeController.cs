using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;

namespace webserver.Controllers {
    [ApiController]
    [Route("type")]
    [EnableCors("CorsPolicy")]
    public class TypeController(ExecutorManager executor, IResourceQueryService queries) : MoneyManagerController {
        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var types = await queries.GetTransactionTypesAsync(executor.UserId, HttpContext.RequestAborted);
            return OkResponse(types.Select(type => LegacyResourceMapper.ToLegacy(type, executor.UserId)), "List of transaction type");
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromHeader(Name = "Authorization")] String authorization, logic.Models.TransactionType type) {
            if (type.Name == null) return ErrorResponse(10, "Not all mandatory data inserted");
            executor.SetToken(authorization);
            var command = new AddTransactionTypeCommand(type.Name);
            try {
                await executor.Execute(command, HttpContext.RequestAborted);
                return CreateResponse(command.Result, "transaction type");
            } catch (DuplicateObjectException) {
                return ErrorResponse(401, "Duplicate transaction type");
            }
        }
    }
}

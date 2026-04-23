using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
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

        [HttpPost()]
        public async Task<IActionResult> Add([FromHeader(Name = "Authorization")] String authorization, logic.Models.TransactionType type) {
            if(type.Name == null) {
                return ErrorResponse(10, "Not all mandatory data inserted");
            }

            var executor = new ExecutorManager(authorization);

            var addTypeCommand = new AddTransactionTypeCommand(type.Name);

            try {
                await executor.Execute(addTypeCommand);

                return CreateResponse(addTypeCommand.Result, "transaction type");
            } catch (DuplicateObjectException) {
                return ErrorResponse(401, "Duplicate transaction type");
            }
        }
    }
}

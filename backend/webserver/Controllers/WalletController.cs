using logic;
using logic.Commands.Wallets;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Mysqlx.Resultset;

namespace webserver.Controllers {
    [ApiController]
    [Route("wallet")]
    [EnableCors("CorsPolicy")]
    public class WalletController : MoneyMenagerController {
        [HttpPost]
        public async Task<IActionResult> Add([FromHeader(Name = "Authorization")] String authorization, [FromBody] Wallet wallet) {
            if (wallet.Color?.Id == null || wallet.Value == null || wallet.Name == null) {
                return ErrorResponse(10, "Not all mandatory data inserted");
            }

            var executor = new ExecutorManager(authorization);

            var addWalletCommand = new AddNewWalletCommand(wallet.Name, wallet.Value.Value, wallet.Color.Id.Value);

            try {
                await executor.Execute(addWalletCommand);

                return OkResponse();
            } catch (DuplicateObjectException) {
                return ErrorResponse(201, "Duplica wallet name");
            }
        }
    }
}

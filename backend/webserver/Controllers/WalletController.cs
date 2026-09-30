using logic;
using logic.Commands.Wallets;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;

namespace webserver.Controllers {
    [ApiController]
    [Route("wallet")]
    [EnableCors("CorsPolicy")]
    public class WalletController(
        ExecutorManager executor,
        IResourceQueryService queries) : MoneyManagerController {
        [HttpPost]
        public async Task<IActionResult> Add([FromHeader(Name = "Authorization")] String authorization, [FromBody] Wallet wallet) {
            if (wallet.Color?.Id == null || wallet.Value == null || wallet.Name == null)
                return ErrorResponse(10, "Not all mandatory data inserted");

            executor.SetToken(authorization);
            var command = new AddNewWalletCommand(wallet.Name, wallet.Value.Value, wallet.Color.Id.Value);
            try {
                await executor.Execute(command, HttpContext.RequestAborted);
                return OkResponse();
            } catch (DuplicateObjectException) {
                return ErrorResponse(201, "Duplica wallet name");
            }
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var wallets = await queries.GetWalletsAsync(executor.UserId, HttpContext.RequestAborted);
            return OkResponse(wallets.Select(wallet => LegacyResourceMapper.ToLegacy(wallet, executor.UserId)), "List of wallets");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var wallet = await queries.GetWalletAsync(executor.UserId, id, HttpContext.RequestAborted)
                ?? throw new ObjectNotFoundException("Wallet not found");
            return OkResponse(LegacyResourceMapper.ToLegacy(wallet, executor.UserId), "List of wallets");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put([FromHeader(Name = "Authorization")] String authorization, [FromBody] Wallet wallet, UInt32 id) {
            executor.SetToken(authorization);
            var command = new EditWalletCommand(id, wallet.Name, wallet.Color?.Id);
            try {
                await executor.Execute(command, HttpContext.RequestAborted);
                return OkResponse();
            } catch (DuplicateObjectException) {
                return ErrorResponse(201, "Duplicate wallet name");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            executor.SetToken(authorization);
            await executor.Execute(new DeleteWalletCommand(id), HttpContext.RequestAborted);
            return OkResponse();
        }

        [HttpPut("favorite/{id}")]
        public async Task<IActionResult> SetFavorite([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            executor.SetToken(authorization);
            await executor.Execute(new FavoriteWalletCommand(id), HttpContext.RequestAborted);
            return OkResponse();
        }
    }
}

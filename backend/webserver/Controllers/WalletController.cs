using logic;
using logic.Commands.User;
using logic.Commands.Wallets;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Mysqlx.Resultset;
using System.Xml.Linq;

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

        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var walletList = (await database.Wallets.Where(w => w.UserId == executor.UserId).Include(w => w.Color).ToListAsync())
                .Select(w => w.Convert());

            return OkResponse(walletList, "List of wallets");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var wallet = database.Wallets.Where(w => w.Id == id && w.UserId == executor.UserId).Include(w => w.Color).First();

            return OkResponse(wallet.Convert(), "List of wallets");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put([FromHeader(Name = "Authorization")] String authorization, [FromBody] Wallet wallet, UInt32 id) {
            var executor = new ExecutorManager(authorization);

            var updateCommand = new EditWalletCommand(id, wallet.Name, wallet.Color?.Id);

            try {
                await executor.Execute(updateCommand);

                return OkResponse();
            } catch (DuplicateObjectException ex) {
                return ErrorResponse(201, "Duplicate wallet name");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            var executor = new ExecutorManager(authorization);

            var deleteCommand = new DeleteWalletCommand(id);

            await executor.Execute(deleteCommand);

            return OkResponse();
        }

        [HttpPut("favorite/{id}")]
        public async Task<IActionResult> SetFavorite([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            Boolean isFavorite;
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            try {
                using (var database = DatabaseFactory.Use()) {
                    var wallet = (await database.Wallets.FirstOrDefaultAsync(w => w.Id == id)) ?? throw new ObjectNotFoundException("wallet not found");

                    isFavorite = wallet.Favorite;
                }

                var updateFavoiteCommand = new FavoriteWalletCommand(id, !isFavorite);

                await executor.Execute(updateFavoiteCommand);

                return OkResponse();
            } catch (ObjectNotFoundException ex) {
                return ErrorResponse(202, "Wallet not found");
            }
        }
    }
}

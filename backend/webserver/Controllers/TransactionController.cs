using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace webserver.Controllers {
    [ApiController]
    [Route("transaction")]
    [EnableCors("CorsPolicy")]
    public class TransactionController : MoneyMenagerController {
        [HttpGet()]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var typeList = await database.Transactions.Where(t => t.UserInsertId == executor.UserId).ToListAsync();

            return OkResponse(typeList.Select(t => t.Convert()), "List of transactions");
        }

        [HttpPost()]
        public async Task<IActionResult> Post([FromHeader(Name = "Authorization")] String authorization, [FromBody] Transaction transaction) {
            if (transaction.Date == null || transaction.Wallet == null || transaction.Wallet.Id == null || transaction.Value == null || transaction.TransactionType == null || transaction.TransactionType.Id == null) {
                return ErrorResponse(10, "Not all mandatory data inserted");
            }

            var executor = new ExecutorManager(authorization);

            var insertTransactionCommand = new AddTransactionCommand(
                description: transaction.Description,
                longDescription: transaction.LongDescription,
                date: DateOnly.FromDateTime(transaction.Date.Value),
                walletId: transaction.Wallet.Id.Value,
                value: transaction.Value.Value,
                transactionTypeId: transaction.TransactionType.Id.Value,
                userId: transaction.User?.Id,
                walletDestinationId: transaction.WalletDestination?.Id);

            try {
                await executor.Execute(insertTransactionCommand);

                return OkResponse();
            } catch (WalletGoesToNegative ex) {
                return ErrorResponse(301, "Wallet goes to negative");
            }
        }
    }
}

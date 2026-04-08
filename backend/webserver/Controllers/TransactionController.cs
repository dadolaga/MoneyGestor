using database.Models;
using logic;
using logic.Commands.Transaction;
using logic.Commands.Wallets;
using logic.Exceptions;
using logic.Managers;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webserver.Models;

namespace webserver.Controllers {
    [ApiController]
    [Route("transaction")]
    [EnableCors("CorsPolicy")]
    public class TransactionController : MoneyMenagerController {
        [HttpGet()]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization, [FromQuery] Filter filter) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var listFilter = ListFilterUtils.Convert(filter.Order, filter.Limit, filter.Offset, filter.Where);

            // TODO Add more complex filter, add and and or check with parenthesis

            var transactionList = await database.Transactions
                .Where(t => t.UserInsertId == executor.UserId)
                .Include(t => t.TransactionType)
                .Include(t => t.Wallet)
                .Include(t => t.Wallet.Color)
                .Include(t => t.TransactionDestination)
                .Include(t => t.TransactionDestination.Wallet)
                .Include(t => t.TransactionDestination.Wallet.Color)
                .Include(t => t.User)
                .Include(t => t.UserInsert)
                .ApplyFilter(listFilter)
                .Where(t => t.TransactionTypeId != DatabaseInitializer.TRANSFER.Id || t.Value > 0)
                .ToListAsync();

            var quantity = await database.Transactions
                .Where(t => t.UserInsertId == executor.UserId && (t.TransactionTypeId != DatabaseInitializer.TRANSFER.Id || t.Value > 0))
                .CountAsync();

            return ListResponse(transactionList.Select(t => t.Convert()).ToList(), quantity, "transaction");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSingle([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            using var database = DatabaseFactory.Use();

            var transaction = await database.Transactions.Where(t => t.Id == id && t.UserId == executor.UserId)
                .Include(t => t.TransactionType)
                .Include(t => t.Wallet)
                .Include(t => t.Wallet.Color)
                .Include(t => t.TransactionDestination)
                .Include(t => t.TransactionDestination.Wallet)
                .Include(t => t.TransactionDestination.Wallet.Color)
                .Include(t => t.User)
                .Include(t => t.UserInsert).FirstAsync();

            return OkResponse(transaction.Convert(), "Transaction");
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

                return CreateResponse(insertTransactionCommand.Result, "transaction");
            } catch (WalletGoesToNegative ex) {
                return ErrorResponse(301, "Wallet goes to negative");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put([FromHeader(Name = "Authorization")] String authorization, [FromBody] Transaction transaction, UInt32 id) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            var updateCommand = new UpdateTransactionCommand(
                id: id,
                description: transaction.Description,
                longDescription: transaction.LongDescription,
                date: transaction.Date != null ? DateOnly.FromDateTime(transaction.Date.Value) : null,
                walletId: transaction.Wallet?.Id,
                walletDestinationId: transaction.WalletDestination?.Id,
                value: transaction.Value,
                transactionTypeId: transaction.TransactionType?.Id,
                userId: transaction.User?.Id,
                forceUpdate: false,
                overwriteNull: false
                );

            await executor.Execute(updateCommand);

            return OkResponse();
        }
    }
}

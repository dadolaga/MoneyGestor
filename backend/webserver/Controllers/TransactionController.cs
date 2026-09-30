using logic;
using logic.Commands.Transaction;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using webserver.Api.V1;
using webserver.Models;

namespace webserver.Controllers {
    [ApiController]
    [Route("transaction")]
    [EnableCors("CorsPolicy")]
    public class TransactionController(ExecutorManager executor, IResourceQueryService queries) : MoneyManagerController {
        [HttpGet]
        public async Task<IActionResult> Get([FromHeader(Name = "Authorization")] String authorization, [FromQuery] Filter filter) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var listFilter = ListFilterUtils.Convert(filter.Order, filter.Limit, filter.Offset, filter.Where);
            var page = await queries.GetLegacyTransactionsAsync(executor.UserId, listFilter, HttpContext.RequestAborted);
            return ListResponse(page.Items.Select(transaction => LegacyResourceMapper.ToLegacy(transaction, executor.UserId)).ToList(),
                checked((Int32)page.TotalCount), "transaction");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSingle([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var transaction = await queries.GetTransactionAsync(executor.UserId, id, HttpContext.RequestAborted)
                ?? throw new ObjectNotFoundException("Transaction not found");
            return OkResponse(LegacyResourceMapper.ToLegacy(transaction, executor.UserId), "Transaction");
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromHeader(Name = "Authorization")] String authorization, [FromBody] Transaction transaction) {
            if (transaction.Date == null || transaction.Wallet?.Id == null || transaction.Value == null || transaction.TransactionType?.Id == null)
                return ErrorResponse(10, "Not all mandatory data inserted");

            executor.SetToken(authorization);
            var command = new AddTransactionCommand(
                description: transaction.Description,
                longDescription: transaction.LongDescription,
                date: DateOnly.FromDateTime(transaction.Date.Value.DateTime),
                walletId: transaction.Wallet.Id.Value,
                value: transaction.Value.Value,
                transactionTypeId: transaction.TransactionType.Id.Value,
                userId: null,
                walletDestinationId: transaction.WalletDestination?.Id);
            try {
                await executor.Execute(command, HttpContext.RequestAborted);
                return CreateResponse(command.Result, "transaction");
            } catch (InvalidTransactionException) {
                return ErrorResponse(302, "Invalid transaction");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put([FromHeader(Name = "Authorization")] String authorization, [FromBody] Transaction transaction, UInt32 id) {
            executor.SetToken(authorization);
            await executor.LoginUser(HttpContext.RequestAborted);
            var command = new UpdateTransactionCommand(
                id: id,
                description: transaction.Description,
                longDescription: transaction.LongDescription,
                date: transaction.Date.HasValue ? DateOnly.FromDateTime(transaction.Date.Value.DateTime) : null,
                walletId: transaction.Wallet?.Id,
                walletDestinationId: transaction.WalletDestination?.Id,
                value: transaction.Value,
                transactionTypeId: transaction.TransactionType?.Id,
                userId: null,
                overwriteNull: false);
            try {
                await executor.Execute(command, HttpContext.RequestAborted);
                return OkResponse();
            } catch (InvalidTransactionException) {
                return ErrorResponse(302, "Invalid transaction");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete([FromHeader(Name = "Authorization")] String authorization, UInt32 id) {
            executor.SetToken(authorization);
            await executor.Execute(new DeleteTransactionCommand(id), HttpContext.RequestAborted);
            return OkResponse();
        }
    }
}

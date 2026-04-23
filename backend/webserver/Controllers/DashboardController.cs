using database.Models;
using logic;
using logic.Commands.User;
using logic.Exceptions;
using logic.Models;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using webserver.Models;

namespace webserver.Controllers {
    [ApiController]
    [Route("dashboard")]
    [EnableCors("CorsPolicy")]
    public class DashboardController : MoneyMenagerController {
        [HttpGet("all")]
        public async Task<IActionResult> All([FromHeader(Name = "Authorization")] String authorization, [FromQuery(Name = "from")] DateTime from, [FromQuery(Name = "to")] DateTime to) {
            var executor = new ExecutorManager(authorization);
            await executor.LoginUser();

            Expression<Func<TransactionDb, Boolean>> whereFunction = t => t.UserId == executor.UserId && t.TransactionDestinationId == null && t.Date >= from && t.Date <= to;

            try {
                using var database = DatabaseFactory.Use();

                var incoming = await database.Transactions.Where(whereFunction).Where(t => t.Value > 0).SumAsync(t => t.Value);
                var expense = await database.Transactions.Where(whereFunction).Where(t => t.Value < 0).SumAsync(t => t.Value);

                var incomingCategories = (await database.Transactions
                    .Where(whereFunction)
                    .Where(t => t.Value < 0)
                    .Include(t => t.TransactionType)
                    .GroupBy(t => t.TransactionTypeId)
                    .ToListAsync())
                    .Select(gt => new TransactionTypeValue { Type = gt.First().TransactionType.Convert(), Value = gt.Sum(t => t.Value) });

                var expenseCategories = (await database.Transactions
                    .Where(whereFunction)
                    .Where(t => t.Value > 0)
                    .Include(t => t.TransactionType)
                    .GroupBy(t => t.TransactionTypeId)
                    .ToListAsync())
                    .Select(gt => new TransactionTypeValue { Type = gt.First().TransactionType.Convert(), Value = gt.Sum(t => t.Value) });

                return OkResponse(new DashboardOutput {
                    Incoming = incoming,
                    Expense = expense,
                    IncomingCategories = incomingCategories,
                    ExpenseCategories = expenseCategories
                });

            } catch (ExecutorException ex) {
                return ErrorResponse(121, "User not found or token exirated");
            }
        }
    }
}

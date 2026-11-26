using logic;
using logic.Exceptions;
using logic.Security;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace webserver.Api.V1;

public static class TransactionPeriodPolicy {
    public static TransactionPeriod RequirePeriod(TransactionFilterQuery query) {
        if (!query.From.HasValue || !BusinessDatePolicy.IsValid(query.From.Value)) {
            throw new ListFilterValidationException("from", "required_date");
        }

        if (!query.To.HasValue || !BusinessDatePolicy.IsValid(query.To.Value)) {
            throw new ListFilterValidationException("to", "required_date");
        }

        return query.From > query.To
            ? throw new ListFilterValidationException("to", "invalid_date_range")
            :  new(query.From.Value, query.To.Value);
    }

    public static TransactionPeriod Previous(TransactionPeriod period) {
        var wholeMonth = period.From.Day == 1 && period.To.Year == period.From.Year && period.To.Month == period.From.Month
            && period.To.Day == DateTime.DaysInMonth(period.From.Year, period.From.Month);
        var length = period.To.DayNumber - period.From.DayNumber + 1;
        var minimum = new DateOnly(1000, 1, 1);
        if (period.From <= minimum || (!wholeMonth && period.From.DayNumber - length < minimum.DayNumber)) {
            throw new ListFilterValidationException("from", "previous_period_out_of_range");
        }

        var end = period.From.AddDays(-1);
        var start = wholeMonth ? new DateOnly(end.Year, end.Month, 1) : period.From.AddDays(-length);
        return start < minimum ? throw new ListFilterValidationException("from", "previous_period_out_of_range") :  new(start, end);
    }
}

public sealed partial class ResourceQueryService {
    private sealed record DailyAggregate(DateOnly Date, Decimal Income, Decimal Expense, Decimal Transfers,
        Int64 IncomeCount, Int64 ExpenseCount, Int64 TransferCount, Int64 MovementCount);

    public async Task<TransactionOverview> GetTransactionOverviewAsync(UInt64 userId, TransactionFilterQuery query, CancellationToken cancellationToken) {
        var period = TransactionPeriodPolicy.RequirePeriod(query);
        var previousPeriod = TransactionPeriodPolicy.Previous(period);
        // InnoDB repeatable-read keeps all aggregate SELECTs on one consistent read snapshot.
        await using var snapshot = await database.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken);
        var rows = FilterTransactions(userId, query);
        var dailyAggregates = await AggregateDaily(rows).ToListAsync(cancellationToken);
        var previousQuery = new TransactionFilterQuery {
            From = previousPeriod.From, To = previousPeriod.To, WalletId = query.WalletId,
            TypeId = query.TypeId, Kind = query.Kind, Search = query.Search
        };
        var previousTotals = await FilterTransactions(userId, previousQuery).GroupBy(item => 1).Select(group => new TransactionTotals(
            group.Sum(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value > 0 ? item.Value : 0m),
            group.Sum(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value < 0 ? -item.Value : 0m),
            group.Sum(item => item.TransactionTypeId == DatabaseInitializer.TRANSFER.Id ? -item.Value : 0m),
            group.LongCount(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value > 0),
            group.LongCount(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value < 0),
            group.LongCount(item => item.TransactionTypeId == DatabaseInitializer.TRANSFER.Id), group.LongCount()))
            .SingleOrDefaultAsync(cancellationToken) ?? new(0, 0, 0, 0, 0, 0, 0);
        var categories = await rows.Where(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value < 0)
            .GroupBy(item => item.TransactionTypeId).Select(group => new { TypeId = group.Key, Value = group.Sum(item => -item.Value) })
            .OrderByDescending(item => item.Value).ThenBy(item => item.TypeId).ToListAsync(cancellationToken);
        await snapshot.CommitAsync(cancellationToken);
        var totals = new TransactionTotals(dailyAggregates.Sum(item => item.Income), dailyAggregates.Sum(item => item.Expense),
            dailyAggregates.Sum(item => item.Transfers), dailyAggregates.Sum(item => item.IncomeCount),
            dailyAggregates.Sum(item => item.ExpenseCount), dailyAggregates.Sum(item => item.TransferCount), dailyAggregates.Sum(item => item.MovementCount));
        var byDate = dailyAggregates.ToDictionary(item => item.Date);
        var daily = Enumerable.Range(period.From.DayNumber, period.To.DayNumber - period.From.DayNumber + 1)
            .Select(day => DateOnly.FromDayNumber(day)).Select(date => byDate.TryGetValue(date, out var item)
                ? new TransactionDaily(date, item.Income, item.Expense, item.Transfers, item.MovementCount)
                : new TransactionDaily(date, 0, 0, 0, 0)).ToArray();
        var weekly = daily.Chunk(7).Select(week => new TransactionWeekly(week[0].Date, week[^1].Date,
            week.Sum(item => item.Income), week.Sum(item => item.Expense))).ToArray();
        return new(period, totals, new(previousPeriod, previousTotals),
            categories.Select(item => new TransactionExpenseCategory(item.TypeId, item.Value)).ToArray(), weekly, daily);
    }

    private static IQueryable<DailyAggregate> AggregateDaily(IQueryable<global::database.Models.TransactionDb> rows) =>
        rows.GroupBy(item => item.Date).Select(group => new DailyAggregate(group.Key,
            group.Sum(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value > 0 ? item.Value : 0m),
            group.Sum(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value < 0 ? -item.Value : 0m),
            group.Sum(item => item.TransactionTypeId == DatabaseInitializer.TRANSFER.Id ? -item.Value : 0m),
            group.LongCount(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value > 0),
            group.LongCount(item => item.TransactionTypeId != DatabaseInitializer.TRANSFER.Id && item.Value < 0),
            group.LongCount(item => item.TransactionTypeId == DatabaseInitializer.TRANSFER.Id), group.LongCount()));

    public IAsyncEnumerable<TransactionResponse> ExportTransactions(UInt64 userId, TransactionFilterQuery query) =>
        FilterTransactions(userId, query).OrderByDescending(item => item.Date).ThenByDescending(item => item.Id)
            .Select(TransactionProjection()).AsAsyncEnumerable();
}
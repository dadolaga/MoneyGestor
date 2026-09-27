using logic.Exceptions;
using logic.Models;
using Microsoft.EntityFrameworkCore;
using TestProject.Infrastructure;

namespace TestProject.Api;

[TestFixture]
[Category("Api")]
internal sealed class ListFilterContractTest {
    [Test]
    public void ValidLegacyFilterUsesPageOffsetAndDeclaredFields() {
        var filter = ListFilterUtils.Convert("!Date+Id", 25, 2, "Value>-10.25&Description~rent");
        Assert.Multiple(() => {
            Assert.That(filter.Limit, Is.EqualTo(25));
            Assert.That(filter.Offset, Is.EqualTo(2));
            Assert.That(filter.Orders, Has.Count.EqualTo(2));
            Assert.That(filter.Wheres, Has.Count.EqualTo(2));
        });
    }

    [TestCase("Description=")]
    [TestCase("UserId=1")]
    [TestCase("Wallet.Color.Value=1")]
    public void MalformedOrPrivateFiltersAreRejected(String where) =>
        Assert.Throws<ListFilterValidationException>(() => ListFilterUtils.Convert(null, 10, 0, where));

    [TestCase(0u)]
    [TestCase(101u)]
    public void PageSizeOutsideContractIsRejected(UInt32 pageSize) =>
        Assert.Throws<ListFilterValidationException>(() => ListFilterUtils.Convert(null, pageSize, 0, null));

    [Test]
    public void PageOffsetOverflowIsRejected() =>
        Assert.Throws<ListFilterValidationException>(() => ListFilterUtils.Convert(null, 100, UInt32.MaxValue, null));

    [Test]
    public async Task TransactionDateRangePlanCanUseOwnerDateIndex() {
        await using var database = TestDatabaseRuntime.CreateContext();
        await database.Database.OpenConnectionAsync();
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = "EXPLAIN SELECT `Id` FROM `transaction` WHERE `UserId` = 1 AND `Date` >= '2026-01-01' AND `Date` <= '2026-12-31' ORDER BY `Date`, `Id` LIMIT 50";

        await using var plan = await command.ExecuteReaderAsync();
        Assert.That(await plan.ReadAsync(), Is.True);
        Assert.That(Convert.ToString(plan["possible_keys"], System.Globalization.CultureInfo.InvariantCulture),
            Does.Contain("IX_transaction_UserId_Date"));
    }
}

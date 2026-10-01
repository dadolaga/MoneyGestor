using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace database;

internal sealed class MoneyGestorContextFactory : IDesignTimeDbContextFactory<MoneyGestorContext> {
    public MoneyGestorContext CreateDbContext(String[] args) {
        var connectionString = Environment.GetEnvironmentVariable("MONEYGESTOR_DESIGN_CONNECTION_STRING");
        if (String.IsNullOrWhiteSpace(connectionString)) {
            throw new InvalidOperationException(
                "MONEYGESTOR_DESIGN_CONNECTION_STRING is required for design-time database operations.");
        }

        var options = new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL(connectionString)
            .Options;

        return new MoneyGestorContext(options);
    }
}
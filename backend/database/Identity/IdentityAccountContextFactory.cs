using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace database.Identity;

internal sealed class IdentityAccountContextFactory : IDesignTimeDbContextFactory<IdentityAccountContext> {
    public IdentityAccountContext CreateDbContext(String[] args) {
        var connectionString = Environment.GetEnvironmentVariable("MONEYGESTOR_DESIGN_CONNECTION_STRING");
        if (String.IsNullOrWhiteSpace(connectionString)) {
            throw new InvalidOperationException(
                "MONEYGESTOR_DESIGN_CONNECTION_STRING is required for design-time Identity operations.");
        }

        var options = new DbContextOptionsBuilder<IdentityAccountContext>()
            .UseMySQL(connectionString)
            .Options;

        return new IdentityAccountContext(options);
    }
}
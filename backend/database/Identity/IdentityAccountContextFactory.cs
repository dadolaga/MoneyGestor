using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace database.Identity;

internal sealed class IdentityAccountContextFactory : IDesignTimeDbContextFactory<IdentityAccountContext> {
    public IdentityAccountContext CreateDbContext(String[] args) {
        var options = new DbContextOptionsBuilder<IdentityAccountContext>()
            .UseMySQL("Server=localhost;Port=3306;Database=moneygestor_design;Uid=design;Pwd=design;")
            .Options;

        return new IdentityAccountContext(options);
    }
}

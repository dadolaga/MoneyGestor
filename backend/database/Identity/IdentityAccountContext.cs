using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace database.Identity;

public sealed class IdentityAccountContext : IdentityDbContext<ApplicationIdentityUser> {
    public IdentityAccountContext(DbContextOptions<IdentityAccountContext> options)
        : base(options) {
    }

    protected override void OnModelCreating(ModelBuilder builder) {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationIdentityUser>()
            .HasIndex(user => user.LegacyUserId)
            .IsUnique();

        builder.Entity<ApplicationIdentityUser>()
            .HasIndex(user => user.NormalizedEmail)
            .HasDatabaseName("EmailIndex")
            .IsUnique();
    }
}
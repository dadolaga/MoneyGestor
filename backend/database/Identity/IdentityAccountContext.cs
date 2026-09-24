using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace database.Identity;

public sealed class IdentityAccountContext : IdentityDbContext<ApplicationIdentityUser> {
    private static String? host;
    private static UInt16? port;
    private static String? databaseName;
    private static String? username;
    private static String? password;

    public IdentityAccountContext(DbContextOptions<IdentityAccountContext> options)
        : base(options) {
    }

    public static void Initialize(
        String databaseHost,
        UInt16 databasePort,
        String name,
        String databaseUser,
        String databasePassword) {
        host = databaseHost;
        port = databasePort;
        databaseName = name;
        username = databaseUser;
        password = databasePassword;
    }

    public static void Configure(DbContextOptionsBuilder optionsBuilder) {
        if (databaseName == null || username == null || password == null) {
            throw new InvalidOperationException("Identity database must be initialized before use");
        }

        optionsBuilder.UseMySQL(
            $"Server={host};Port={port};Database={databaseName};Uid={username};Pwd={password};");
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

using database;
using database.Identity;
using database.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace ExportImportApplication;

internal sealed class ArchiveTable {
    internal required String FileName { get; init; }
    internal required Type EntityType { get; init; }
    internal required PropertyInfo[] Properties { get; init; }
    internal required Func<MoneyGestorContext, CancellationToken, Task<List<Object>>> LoadAsync { get; init; }

    private static ArchiveTable Define<T>(String fileName, params String[] columns) where T : class => new() {
        FileName = fileName,
        EntityType = typeof(T),
        Properties = columns.Select(column => typeof(T).GetProperty(column)
            ?? throw new InvalidOperationException("The archive contract contains an unknown property.")).ToArray(),
        LoadAsync = async (database, cancellationToken) =>
            (await database.Set<T>().AsNoTracking().ToListAsync(cancellationToken)).Cast<Object>().ToList()
    };

    // Explicit columns are the versioned logical format. Navigation properties are never exported.
    internal static readonly ArchiveTable[] All = [
        Define<IdentityRole<UInt64>>("roles.csv", "Id", "Name", "NormalizedName", "ConcurrencyStamp"),
        Define<ApplicationIdentityUser>("users.csv", "Id", "Firstname", "Lastname", "UserName", "NormalizedUserName",
            "Email", "NormalizedEmail", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
            "PhoneNumber", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnd", "LockoutEnabled", "AccessFailedCount"),
        Define<IdentityRoleClaim<UInt64>>("role_claims.csv", "Id", "RoleId", "ClaimType", "ClaimValue"),
        Define<IdentityUserClaim<UInt64>>("user_claims.csv", "Id", "UserId", "ClaimType", "ClaimValue"),
        Define<IdentityUserLogin<UInt64>>("user_logins.csv", "LoginProvider", "ProviderKey", "ProviderDisplayName", "UserId"),
        Define<IdentityUserRole<UInt64>>("user_roles.csv", "UserId", "RoleId"),
        Define<IdentityUserToken<UInt64>>("user_tokens.csv", "UserId", "LoginProvider", "Name", "Value"),
        Define<ColorDb>("colors.csv", "Id", "Name", "Value", "UserId"),
        Define<TransactionTypeDb>("transaction_types.csv", "Id", "Name", "UserId", "ParentId", "Icon", "Color",
            "Description", "Keywords", "UseInReports"),
        Define<WalletDb>("wallets.csv", "Id", "Name", "Value", "CurrentValue", "BalanceVersion", "Favorite", "Kind",
            "Currency", "Institution", "Iban", "LastFour", "Network", "Expiry", "LinkedAccountId", "CreditLimit",
            "CurrentSpending", "StatementDay", "PaymentDay", "Notes", "Shareable", "ColorId", "UserId"),
        Define<TransactionDb>("transactions.csv", "Id", "Description", "LongDescription", "Date", "TransactionTypeId",
            "UserId", "UserInsertId", "WalletId", "Value", "TransactionDestinationId")
    ];
}

internal sealed class ArchiveSnapshot {
    internal Dictionary<Type, List<Object>> Rows { get; } = [];
    internal IEnumerable<T> Get<T>() => Rows[typeof(T)].Cast<T>();
}

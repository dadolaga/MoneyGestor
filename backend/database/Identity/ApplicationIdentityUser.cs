using database.Models;
using Microsoft.AspNetCore.Identity;

namespace database.Identity;

public sealed class ApplicationIdentityUser : IdentityUser<UInt64> {
    public String Firstname { get; set; } = String.Empty;
    public String Lastname { get; set; } = String.Empty;
    public ICollection<TransactionTypeDb> Types { get; set; } = [];
    public ICollection<ColorDb> Colors { get; set; } = [];
    public ICollection<WalletDb> Wallets { get; set; } = [];
    public ICollection<TransactionDb> Transactions { get; set; } = [];
    public ICollection<TransactionDb> TransactionsInsert { get; set; } = [];
}
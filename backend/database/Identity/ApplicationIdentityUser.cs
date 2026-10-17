using database.Models;
using Microsoft.AspNetCore.Identity;

namespace database.Identity;

public sealed class ApplicationIdentityUser : IdentityUser<UInt64> {
    public String Firstname { get; set; } = String.Empty;
    public String Lastname { get; set; } = String.Empty;
    public ICollection<TransactionTypeDb> Types { get; set; } = new List<TransactionTypeDb>();
    public ICollection<ColorDb> Colors { get; set; } = new List<ColorDb>();
    public ICollection<WalletDb> Wallets { get; set; } = new List<WalletDb>();
    public ICollection<TransactionDb> Transactions { get; set; } = new List<TransactionDb>();
    public ICollection<TransactionDb> TransactionsInsert { get; set; } = new List<TransactionDb>();
}

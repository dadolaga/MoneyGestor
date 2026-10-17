using database.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models {
    [Table("wallet")]
    public class WalletDb {
        public UInt64 Id { get; set; }
        public String Name { get; set; } = String.Empty;
        public Decimal Value { get; set; }
        public Decimal CurrentValue { get; set; }
        public UInt64 BalanceVersion { get; set; }
        public Boolean Favorite { get; set; }
        public String Kind { get; set; } = "bank";
        public String Currency { get; set; } = "EUR";
        public String? Institution { get; set; }
        public String? Iban { get; set; }
        public String? LastFour { get; set; }
        public String? Network { get; set; }
        public String? Expiry { get; set; }
        public UInt64? LinkedAccountId { get; set; }
        public WalletDb? LinkedAccount { get; set; }
        public Decimal? CreditLimit { get; set; }
        public Decimal? CurrentSpending { get; set; }
        public Int32? StatementDay { get; set; }
        public Int32? PaymentDay { get; set; }
        public String? Notes { get; set; }
        public Boolean Shareable { get; set; }
        public UInt64 ColorId { get; set; }
        public ColorDb? Color { get; set; }
        public UInt64 UserId { get; set; }
        public ApplicationIdentityUser? User { get; set; }
        public ICollection<TransactionDb> Transactions { get; set; } = new List<TransactionDb>();
    }
}

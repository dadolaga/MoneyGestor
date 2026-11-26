using database.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models {

    [Table("transaction")]
    public class TransactionDb {
        public UInt64 Id { get; set; }
        public String? Description { get; set; }
        public String? LongDescription { get; set; }
        public DateOnly Date { get; set; }
        public UInt64 TransactionTypeId { get; set; }
        public TransactionTypeDb? TransactionType { get; set; }
        public UInt64 UserId { get; set; }
        public ApplicationIdentityUser? User { get; set; }
        public UInt64 UserInsertId { get; set; }
        public ApplicationIdentityUser? UserInsert { get; set; }
        public UInt64 WalletId { get; set; }
        public WalletDb? Wallet { get; set; }
        public Decimal Value { get; set; }
        public UInt64? TransactionDestinationId { get; set; }
        public TransactionDb? TransactionDestination { get; set; }
        public TransactionDb? TransactionDestinationBack { get; set; }
    }
}
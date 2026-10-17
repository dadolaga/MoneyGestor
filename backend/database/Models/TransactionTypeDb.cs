using database.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models {

    [Table("transaction_type")]
    public class TransactionTypeDb {
        public UInt64 Id { get; set; }
        public String Name { get; set; } = String.Empty;
        public UInt64? UserId { get; set; }
        public ApplicationIdentityUser? User { get; set; }
        public ICollection<TransactionDb> Transactions { get; set; } = new List<TransactionDb>();
    }
}

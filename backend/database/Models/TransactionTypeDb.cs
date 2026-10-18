using database.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models {

    [Table("transaction_type")]
    public class TransactionTypeDb {
        public UInt64 Id { get; set; }
        public String Name { get; set; } = String.Empty;
        public UInt64? UserId { get; set; }
        public ApplicationIdentityUser? User { get; set; }
        public UInt64? ParentId { get; set; }
        public TransactionTypeDb? Parent { get; set; }
        public String Icon { get; set; } = "tag";
        public String Color { get; set; } = "grey";
        public String? Description { get; set; }
        public String? Keywords { get; set; }
        public Boolean UseInReports { get; set; } = true;
        public ICollection<TransactionDb> Transactions { get; set; } = new List<TransactionDb>();
    }
}

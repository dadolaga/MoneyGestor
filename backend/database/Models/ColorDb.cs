using database.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace database.Models {

    [Table("color")]
    public class ColorDb {
        public UInt64 Id { get; set; }
        public String? Name { get; set; }
        public UInt32 Value { get; set; }
        public UInt64? UserId { get; set; }
        public ApplicationIdentityUser? User { get; set; }
        public ICollection<WalletDb> Wallets { get; set; } = [];
    }
}
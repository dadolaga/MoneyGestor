using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database.Models {

    [Table("color")]
    public class ColorDb {
        public UInt64 Id { get; set; }
        public String? Name { get; set; }
        public UInt32 Value { get; set; }
        public UInt64? UserId { get; set; }
        public UserDb? User { get; set; }
        public ICollection<WalletDb> Wallets { get; set; }
    }
}
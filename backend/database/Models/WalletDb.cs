using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database.Models {
    [Table("wallet")]
    public class WalletDb {
        public UInt64 Id { get; set; }
        public string Name { get; set; }
        public double Value { get; set; }
        public bool Favorite { get; set; }
        public UInt64 ColorId { get; set; }
        public ColorDb Color { get; set; }
        public UInt64 UserId { get; set; }
        public UserDb User { get; set; }
        public ICollection<TransactionDb> Transactions { get; set;}
    }
}

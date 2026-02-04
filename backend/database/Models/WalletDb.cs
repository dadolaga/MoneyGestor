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
        public String Name { get; set; }
        public Double Value { get; set; }
        public Double CurrentValue { get; set; }
        public Boolean Favorite { get; set; }
        public UInt64 ColorId { get; set; }
        public ColorDb Color { get; set; }
        public UInt64 UserId { get; set; }
        public UserDb User { get; set; }
        public ICollection<TransactionDb> Transactions { get; set; }
    }
}
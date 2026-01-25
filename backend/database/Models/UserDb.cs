using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database.Models {

    [Table("user")]
    public class UserDb {
        public UInt64 Id { get; set; }
        public String Firstname { get; set; }
        public String Lastname { get; set; }
        public String Email { get; set; }
        public String Username { get; set; }
        public String Password { get; set; }
        public ICollection<LoginDb> Logins { get; set; }
        public ICollection<TransactionTypeDb> Types { get; set; }
        public ICollection<ColorDb> Colors { get; set; }
        public ICollection<WalletDb> Wallets { get; set; }
        public ICollection<TransactionDb> Transactions { get; set; }
        public ICollection<TransactionDb> TransactionsInsert { get; set; }
    }
}
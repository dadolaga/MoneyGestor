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
        public string Firstname { get; set; }
        public string Lastname { get; set; }
        public string Email { get; set; }
        public string Username { get; set; }
        public ICollection<LoginDb> Logins { get; set; }
        public ICollection<TransactionTypeDb> Types { get; set; }
        public ICollection<ColorDb> Colors { get; set; }
        public ICollection<WalletDb> Wallets { get; set; }
        public ICollection<TransactionDb> Transactions { get; set; }
        public ICollection<TransactionDb> TransactionsInsert { get; set; }
    }
}

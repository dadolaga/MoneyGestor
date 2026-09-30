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
        public String Firstname { get; set; } = String.Empty;
        public String Lastname { get; set; } = String.Empty;
        public String Email { get; set; } = String.Empty;
        public String Username { get; set; } = String.Empty;
        public String Password { get; set; } = String.Empty;
        public ICollection<LoginDb> Logins { get; set; } = new List<LoginDb>();
        public ICollection<TransactionTypeDb> Types { get; set; } = new List<TransactionTypeDb>();
        public ICollection<ColorDb> Colors { get; set; } = new List<ColorDb>();
        public ICollection<WalletDb> Wallets { get; set; } = new List<WalletDb>();
        public ICollection<TransactionDb> Transactions { get; set; } = new List<TransactionDb>();
        public ICollection<TransactionDb> TransactionsInsert { get; set; } = new List<TransactionDb>();
    }
}
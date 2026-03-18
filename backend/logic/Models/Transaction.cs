using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class Transaction {
        public UInt64? Id { get; set; }
        public String? Description { get; set; }
        public String? LongDescription { get; set; }
        public DateTime? Date { get; set; }
        public Type? TransactionType { get; set; }
        public User? User { get; set; }
        public User? UserInsert { get; set; }
        public Wallet? Wallet { get; set; }
        public Wallet? WalletDestination { get; set; }
        public Double? Value { get; set; }
    }
}

using Org.BouncyCastle.Asn1.Mozilla;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database.Models {

    [Table("transaction")]
    public class TransactionDb {
        public UInt64 Id { get; set; }
        public string? Description { get; set; }
        public string? LongDescription { get; set; }
        public DateOnly Date { get; set; }
        public UInt64 TransactionTypeId { get; set; }
        public TransactionTypeDb TransactionType { get; set; }
        public UInt64? UserId { get; set; }
        public UserDb? User { get; set; }
        public UInt64 UserInsertId { get; set; }
        public UserDb UserInsert { get; set; }
        public UInt64 WalletId { get; set; }
        public WalletDb Wallet { get; set; }
        public double Value { get; set; }
        public UInt64? TransactionDestinationId { get; set; }
        public TransactionDb? TransactionDestination { get; set; }
        public TransactionDb? TransactionDestinationBack { get; set; }
    }
}

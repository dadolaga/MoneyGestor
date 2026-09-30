using database.Models;
using logic.Models;

namespace webserver.Models {
    public class DashboardOutput {
        public Decimal Incoming { get; set; }
        public Decimal Expense { get; set; }
        public IEnumerable<TransactionTypeValue> IncomingCategories { get; set; } = Array.Empty<TransactionTypeValue>();
        public IEnumerable<TransactionTypeValue> ExpenseCategories { get; set; } = Array.Empty<TransactionTypeValue>();
    }

    public class TransactionTypeValue {
        public TransactionType Type { get; set; } = new TransactionType();
        public Decimal Value { get; set; }
    }
}

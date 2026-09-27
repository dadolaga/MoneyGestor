using database.Models;
using logic.Models;

namespace webserver.Models {
    public class DashboardOutput {
        public Decimal Incoming { get; set; }
        public Decimal Expense { get; set; }
        public IEnumerable<TransactionTypeValue> IncomingCategories { get; set; }
        public IEnumerable<TransactionTypeValue> ExpenseCategories { get; set; }
    }

    public class TransactionTypeValue {
        public TransactionType Type { get; set; }
        public Decimal Value { get; set; }
    }
}

using database.Models;
using logic.Models;

namespace webserver.Models {
    public class DashboardOutput {
        public Double Incoming { get; set; }
        public Double Expense { get; set; }
        public IEnumerable<TransactionTypeValue> IncomingCategories { get; set; }
        public IEnumerable<TransactionTypeValue> ExpenseCategories { get; set; }
    }

    public class TransactionTypeValue {
        public TransactionType Type { get; set; }
        public Double Value { get; set; }
    }
}

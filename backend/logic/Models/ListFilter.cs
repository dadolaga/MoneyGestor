using logic.Exceptions;
using System.Globalization;

namespace logic.Models {
    /// <summary>Parses the legacy list contract. Offset deliberately remains a zero-based page number.</summary>
    public static class ListFilterUtils {
        public const UInt32 DEFAULT_LIMIT = 100;
        public const UInt32 MAX_LIMIT = 100;
        private static readonly HashSet<String> Fields = new(StringComparer.OrdinalIgnoreCase) {
            "Id", "Description", "LongDescription", "Date", "Value", "TransactionTypeId", "WalletId"
        };

        public static ListFilter Convert(String? order, UInt32? limit, UInt32? offset, String? where) {
            var pageSize = limit.GetValueOrDefault(DEFAULT_LIMIT);
            var page = offset.GetValueOrDefault(0);
            if (pageSize is 0 or > MAX_LIMIT || (UInt64)page * pageSize > Int32.MaxValue) {
                throw new ListFilterValidationException("limit", "out_of_range");
            }

            var orders = ParseOrder(order);
            var wheres = ParseWhere(where);
            return new ListFilter { Limit = pageSize, Offset = page, Orders = orders, Wheres = wheres };
        }

        private static IList<Order> ParseOrder(String? order) {
            var result = new List<Order>();
            if (String.IsNullOrWhiteSpace(order)) return result;
            foreach (var raw in order.Split('+')) {
                var desc = raw.StartsWith('!');
                var name = desc ? raw[1..] : raw;
                RequireField(name, "order");
                if (result.Any(item => item.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                    throw new ListFilterValidationException("order", "duplicate_field");
                result.Add(new Order { Name = name, Descending = desc });
            }
            return result;
        }

        private static IList<Where> ParseWhere(String? where) {
            var result = new List<Where>();
            if (String.IsNullOrWhiteSpace(where)) return result;
            foreach (var clause in where.Split('&')) {
                var index = clause.IndexOfAny(['=', '~', '!', '<', '>']);
                if (index <= 0 || index == clause.Length - 1 || clause.IndexOfAny(['=', '~', '!', '<', '>'], index + 1) >= 0)
                    throw new ListFilterValidationException("where", "malformed_filter");
                var name = clause[..index];
                RequireField(name, "where");
                var comparator = clause[index] switch {
                    '=' => EComparatorType.EQUAL,
                    '~' => EComparatorType.LIKE,
                    '!' => EComparatorType.NOT_EQUAL,
                    '<' => EComparatorType.LESS,
                    '>' => EComparatorType.GREATER,
                    _ => throw new ListFilterValidationException("where", "unsupported_comparator")
                };
                var value = clause[(index + 1)..];
                if (value.Length > 256) throw new ListFilterValidationException("where", "value_too_long");
                result.Add(new Where { Name = name, ComparatorType = comparator, Value = value });
            }
            return result;
        }

        private static void RequireField(String name, String field) {
            if (!Fields.Contains(name)) throw new ListFilterValidationException(field, "unknown_field");
        }
    }

    public enum EComparatorType { EQUAL, LIKE, NOT_EQUAL, LESS, GREATER }
    public class ListFilter {
        public UInt32 Limit { get; set; }
        public UInt32 Offset { get; set; }
        public IList<Order> Orders { get; set; } = new List<Order>();
        public IList<Where> Wheres { get; set; } = new List<Where>();
    }
    public class Order { public String Name { get; set; } = ""; public Boolean Descending { get; set; } }
    public class Where { public String Name { get; set; } = ""; public EComparatorType ComparatorType { get; set; } public String Value { get; set; } = ""; }
}

using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using logic.Exceptions;
using logic.Models;

namespace logic.Managers {
    public static class ListManager {
        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, String name, Boolean descending, Boolean first = true) {
            var property = typeof(T).GetProperty(name, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance)
                ?? throw new ListFilterValidationException("order", "unknown_field");
            var parameter = Expression.Parameter(typeof(T), "item");
            var selector = Expression.Lambda(Expression.Property(parameter, property), parameter);
            var method = first ? (descending ? "OrderByDescending" : "OrderBy") : (descending ? "ThenByDescending" : "ThenBy");
            var call = Expression.Call(typeof(Queryable), method, [typeof(T), property.PropertyType], source.Expression, Expression.Quote(selector));
            return (IOrderedQueryable<T>)source.Provider.CreateQuery<T>(call);
        }

        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, Order order, Boolean first = true) =>
            source.OrderByPropertyName(order.Name, order.Descendent, first);

        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, IList<Order> orders) {
            IOrderedQueryable<T>? ordered = null;
            foreach (var order in orders) ordered = (ordered ?? source).OrderByPropertyName(order, ordered == null);
            return ordered ?? throw new ArgumentException("At least one order is required.", nameof(orders));
        }

        public static IQueryable<T> WhereByFilter<T>(this IQueryable<T> source, Where where) {
            var property = typeof(T).GetProperty(where.Name, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance)
                ?? throw new ListFilterValidationException("where", "unknown_field");
            var parameter = Expression.Parameter(typeof(T), "item");
            Expression member = Expression.Property(parameter, property);
            var memberType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            if (where.ComparatorType == EComparatorType.LIKE) {
                if (memberType != typeof(String)) throw new ListFilterValidationException("where", "comparator_not_supported");
                var contains = Expression.Call(member, nameof(String.Contains), Type.EmptyTypes, Expression.Constant(where.Value));
                return source.Where(Expression.Lambda<Func<T, Boolean>>(contains, parameter));
            }

            Object parsed;
            try {
                parsed = memberType == typeof(DateOnly)
                    ? DateOnly.ParseExact(where.Value, "yyyy-MM-dd", CultureInfo.InvariantCulture)
                    : Convert.ChangeType(where.Value, memberType, CultureInfo.InvariantCulture)!;
            } catch (Exception exception) when (exception is FormatException or InvalidCastException or OverflowException or ArgumentOutOfRangeException) {
                throw new ListFilterValidationException("where", "invalid_value");
            }
            Expression right = Expression.Constant(parsed, memberType);
            if (memberType != property.PropertyType) right = Expression.Convert(right, property.PropertyType);
            Expression predicate = where.ComparatorType switch {
                EComparatorType.EQUAL => Expression.Equal(member, right),
                EComparatorType.NOT_EQUAL => Expression.NotEqual(member, right),
                EComparatorType.LESS when memberType != typeof(String) => Expression.LessThan(member, right),
                EComparatorType.GREATHER when memberType != typeof(String) => Expression.GreaterThan(member, right),
                _ => throw new ListFilterValidationException("where", "comparator_not_supported")
            };
            return source.Where(Expression.Lambda<Func<T, Boolean>>(predicate, parameter));
        }

        public static IQueryable<T> WhereByFilter<T>(this IQueryable<T> source, IEnumerable<Where> wheres) =>
            wheres.Aggregate(source, (query, filter) => query.WhereByFilter(filter));

        public static IQueryable<T> ApplyFilter<T>(this IQueryable<T> source, ListFilter filter) {
            var query = source.WhereByFilter(filter.Wheres);
            IOrderedQueryable<T> ordered;
            if (filter.Orders.Count == 0) {
                ordered = query.OrderByPropertyName("Id", descending: false);
            } else {
                ordered = query.OrderByPropertyName(filter.Orders);
                if (!filter.Orders.Any(order => order.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)))
                    ordered = ordered.OrderByPropertyName("Id", descending: false, first: false);
            }
            var skip = checked((Int32)((UInt64)filter.Offset * filter.Limit));
            return ordered.Skip(skip).Take(checked((Int32)filter.Limit));
        }
    }
}

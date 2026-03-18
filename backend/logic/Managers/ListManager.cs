using logic.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace logic.Managers {
    public static class ListManager {
        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, String propertyName, Boolean descending) {
            var type = typeof(T);
            var property = type.GetProperty(propertyName, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

            if (property == null) {
                return (IOrderedQueryable<T>) source;
            }

            var parameter = Expression.Parameter(type, "p");
            var propertyAccess = Expression.MakeMemberAccess(parameter, property);
            var orderByExp = Expression.Lambda(propertyAccess, parameter);

            String methodName = descending ? "OrderByDescending" : "OrderBy";
            var resultExp = Expression.Call(typeof(Queryable), methodName,
                                new System.Type[] { type, property.PropertyType },
                                source.Expression, Expression.Quote(orderByExp));

            return (IOrderedQueryable<T>) source.Provider.CreateQuery<T>(resultExp);
        }

        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, Order order) => source.OrderByPropertyName(order.Name, order.Descendent);

        public static IOrderedQueryable<T> ApplyFilter<T>(this IQueryable<T> source, ListFilter filter) {
            source = source.Skip(filter.Offset * filter.Limit).Take(filter.Limit);

            return filter.Orders.Count > 0 ? source.OrderByPropertyName(filter.Orders.First()) : (IOrderedQueryable<T>) source;
        }
    }
}

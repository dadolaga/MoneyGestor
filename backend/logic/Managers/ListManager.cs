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
        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, String propertyName, Boolean descending, Boolean first = true) {
            var type = typeof(T);
            var property = type.GetProperty(propertyName, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

            if (property == null) {
                return (IOrderedQueryable<T>) source;
            }

            var parameter = Expression.Parameter(type, "p");
            var propertyAccess = Expression.MakeMemberAccess(parameter, property);
            var orderByExp = Expression.Lambda(propertyAccess, parameter);

            String methodName = first ? (descending ? "OrderByDescending" : "OrderBy") : (descending ? "ThenByDescending" : "ThenBy");
            var resultExp = Expression.Call(typeof(Queryable), methodName,
                                new System.Type[] { type, property.PropertyType },
                                source.Expression, Expression.Quote(orderByExp));

            return (IOrderedQueryable<T>) source.Provider.CreateQuery<T>(resultExp);
        }

        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, Order order, Boolean first = true) => source.OrderByPropertyName(order.Name, order.Descendent, first);

        public static IOrderedQueryable<T> OrderByPropertyName<T>(this IQueryable<T> source, IList<Order> orders) {
            Boolean first = true;
            var newSource = (IOrderedQueryable<T>) source;

            foreach (var order in orders) {
                newSource = newSource.OrderByPropertyName(order, first);
                first = false;
            }

            return newSource;
        }


        public static IOrderedQueryable<T> ApplyFilter<T>(this IQueryable<T> source, ListFilter filter) {
            source = source.Skip((Int32) (filter.Offset * filter.Limit)).Take((Int32) filter.Limit);

            return source.OrderByPropertyName(filter.Orders);
        }
    }
}

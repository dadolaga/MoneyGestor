using Google.Protobuf.WellKnownTypes;
using logic.Models;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Org.BouncyCastle.Crypto;
using Serilog;
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
            var parameter = Expression.Parameter(type, "p");
            Expression propertyAccess = parameter;

            foreach (var part in propertyName.Split('.')) {
                PropertyInfo? property = propertyAccess.Type.GetProperty(part, BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

                if (property == null) {
                    return (IOrderedQueryable<T>) source;
                }

                propertyAccess = Expression.MakeMemberAccess(propertyAccess, property);
            }

            var orderByExp = Expression.Lambda(propertyAccess, parameter);

            String methodName = first
                ? (descending ? "OrderByDescending" : "OrderBy")
                : (descending ? "ThenByDescending" : "ThenBy");

            var resultExp = Expression.Call(
                typeof(Queryable),
                methodName,
                new System.Type[] { type, propertyAccess.Type },
                source.Expression,
                Expression.Quote(orderByExp)
            );

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

        public static IQueryable<T> WhereByFilter<T>(this IQueryable<T> source, Where where) {
            var type = typeof(T);
            var parameter = Expression.Parameter(type, "p");
            Expression propertyAccess = parameter;

            foreach (var part in where.Name.Split('.')) {
                PropertyInfo? property = propertyAccess.Type.GetProperty(part,
                    BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

                if (property == null) {
                    return source;
                }

                propertyAccess = Expression.MakeMemberAccess(propertyAccess, property);
            }

            var comparison = CreateComparisonExpression(where, propertyAccess);

            if (comparison == null) {
                return source;
            }

            var lambda = Expression.Lambda(comparison, parameter);

            var resultExp = Expression.Call(
                typeof(Queryable),
                "Where",
                new System.Type[] { type },
                source.Expression,
                Expression.Quote(lambda)
            );

            return source.Provider.CreateQuery<T>(resultExp);
        }

        public static IQueryable<T> WhereByFilter<T>(this IQueryable<T> source, IEnumerable<Where> wheres) {
            foreach (var where in wheres) {
                source = source.WhereByFilter(where);
            }

            return source;
        }

        public static IOrderedQueryable<T> ApplyFilter<T>(this IQueryable<T> source, ListFilter filter) {
            source = source.Skip((Int32) (filter.Offset * filter.Limit)).Take((Int32) filter.Limit);

            return source.WhereByFilter(filter.Wheres).OrderByPropertyName(filter.Orders);
        }

        private static Expression? CreateComparisonExpression(Where where, Expression propreryAccess) {
            if (where.ComparatorType == EComparatorType.LIKE) {
                Expression? andExpression = null;

                if (propreryAccess.Type == typeof(String)) {
                    foreach (var value in where.Value.Split(" ")) {
                        var expressionSplittedValue = CreateValue(propreryAccess.Type, value);

                        if (expressionSplittedValue == null) {
                            return null;
                        }

                        MethodInfo? containsMethod = typeof(String).GetMethod("Contains", new[] { typeof(String) });
                        var containExpression = Expression.Call(propreryAccess, containsMethod, expressionSplittedValue);

                        andExpression = andExpression == null ? containExpression : Expression.And(andExpression, containExpression);
                    }
                } else {
                    var expressionSplittedValue = CreateValue(propreryAccess.Type, where.Value);
                }

                return andExpression!;
            }

            var expressoinValue = CreateValue(propreryAccess.Type, where.Value);

            if (expressoinValue == null) {
                return null;
            }

            if (where.ComparatorType == EComparatorType.EQUAL) {
                return Expression.Equal(propreryAccess, expressoinValue);
            }

            if (where.ComparatorType == EComparatorType.NOT_EQUAL) {
                return Expression.NotEqual(propreryAccess, expressoinValue);
            }

            if (where.ComparatorType == EComparatorType.LESS) {
                return Expression.LessThan(propreryAccess, expressoinValue);
            }

            if (where.ComparatorType == EComparatorType.GREATHER) {
                return Expression.GreaterThan(propreryAccess, expressoinValue);
            }

            return null;
        }

        private static UnaryExpression? CreateValue(System.Type type, String stringValue) {
            try {
                System.Type conversionType = Nullable.GetUnderlyingType(type) ?? type;

                Object? convertedValue = Convert.ChangeType(stringValue, conversionType);
                var valueWrapper = new ParameterWrapper { Value = convertedValue };
                var constantWrapper = Expression.Constant(valueWrapper);
                var valueAccess = Expression.Property(constantWrapper, nameof(ParameterWrapper.Value));

                return Expression.Convert(valueAccess, type);
            } catch {
                return null;
            }
        }

        private class ParameterWrapper {
            public Object? Value { get; set; }
        }
    }
}

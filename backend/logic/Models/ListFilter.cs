using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class ListFilterUtils {
        public const UInt32 DEFAULT_LIMIT = 100;

        public static ListFilter Convert(String? order, UInt32? limit, UInt32? offset, String? where) {
            var listFilter = new ListFilter {
                Limit = limit.GetValueOrDefault(DEFAULT_LIMIT),
                Offset = offset.GetValueOrDefault(0),
                Orders = ConvertOrder(order).ToList(),
                Wheres = ConvertWhere(where).ToList()
            };

            return listFilter;
        }

        private static IEnumerable<Order> ConvertOrder(String? order) {
            const Char propretiesDelimiter = '+';
            const Char descendentChar = '!';

            if (order != null && order.Length > 0) {
                foreach (var propriety in order.Split(propretiesDelimiter)) {
                    Boolean isDescendent = propriety[0] == descendentChar;

                    yield return new Order {
                        Name = isDescendent ? propriety[1..] : propriety,
                        Descendent = isDescendent
                    };
                }
            }
        }

        private static IEnumerable<Where> ConvertWhere(String? where) {
            const Char andComparator = '&';
            const Char equalComparator = '=';
            const Char likeComparator = '~';
            const Char notEqualComparator = '!';
            const Char lessComparator = '<';
            const Char greatherComparator = '>';

            if (where != null && where.Length > 0) {
                foreach (var whereClause in where.Split(andComparator)) {
                    EComparatorType comparatorType = EComparatorType.EQUAL;
                    String[] splittedString = [];

                    if (whereClause.Contains(equalComparator)) {
                        splittedString = whereClause.Split(equalComparator);
                        comparatorType = EComparatorType.EQUAL;
                    } else if (whereClause.Contains(likeComparator)) {
                        splittedString = whereClause.Split(likeComparator);
                        comparatorType = EComparatorType.LIKE;
                    } else if (whereClause.Contains(notEqualComparator)) {
                        splittedString = whereClause.Split(notEqualComparator);
                        comparatorType = EComparatorType.NOT_EQUAL;
                    } else if (whereClause.Contains(lessComparator)) {
                        splittedString = whereClause.Split(lessComparator);
                        comparatorType = EComparatorType.LESS;
                    } else if (whereClause.Contains(greatherComparator)) {
                        splittedString = whereClause.Split(greatherComparator);
                        comparatorType = EComparatorType.GREATHER;
                    }

                    yield return new Where {
                        Name = splittedString[0],
                        ComparatorType = comparatorType,
                        Value = splittedString[1]
                    };
                }
            }
        }
    }

    public enum EComparatorType {
        EQUAL,
        LIKE,
        NOT_EQUAL,
        LESS,
        GREATHER,
    }

    public class ListFilter {
        public UInt32 Limit { get; set; }
        public UInt32 Offset { get; set; }
        public IList<Order> Orders { get; set; }
        public IList<Where> Wheres { get; set; }
    }

    public class Order {
        public String Name { get; set; }
        public Boolean Descendent { get; set; }
    }

    public class Where {
        public String Name { get; set; }
        public EComparatorType ComparatorType { get; set; }
        public String Value { get; set; }
    }
}

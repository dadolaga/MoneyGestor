using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class ListFilterUtils {
        public const UInt32 DEFAULT_LIMIT = 100;

        public static ListFilter Convert(String? order, UInt32? limit, UInt32? offset) {
            const Char propretiesDelimiter = '+';
            const Char descendentChar = '!';

            var listFilter = new ListFilter {
                Limit = limit.GetValueOrDefault(DEFAULT_LIMIT),
                Offset = offset.GetValueOrDefault(0),
                Orders = new List<Order>()
            };

            if (order != null) {
                foreach (var propriety in order.Split(propretiesDelimiter)) {
                    Boolean isDescendent = propriety[0] == descendentChar;

                    listFilter.Orders.Add(new Order {
                        Name = isDescendent ? propriety[1..] : propriety,
                        Descendent = isDescendent
                    });
                }
            }

            return listFilter;
        }
    }

    public class ListFilter {
        public UInt32 Limit { get; set; }
        public UInt32 Offset { get; set; }
        public IList<Order> Orders { get; set; }
    }

    public class Order {
        public String Name { get; set; }
        public Boolean Descendent { get; set; }
    }
}

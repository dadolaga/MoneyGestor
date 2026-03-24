using logic.Models;
using Mysqlx.Crud;

namespace webserver.Models {
    public class Filter {
        public String Order { get; set; } = "";
        public UInt32 Offset { get; set; } = 0;
        public UInt32 Limit { get; set; } = 100;

        public ListFilter Convert() {
            const Char propretiesDelimiter = '+';
            const Char descendentChar = '!';

            var listFilter = new ListFilter {
                Limit = Limit,
                Offset = Offset,
                Orders = new List<logic.Models.Order>()
            };

            if (Order != null && Order.Length > 0) {
                foreach (var propriety in Order.Split(propretiesDelimiter)) {
                    Boolean isDescendent = propriety[0] == descendentChar;

                    listFilter.Orders.Add(new logic.Models.Order {
                        Name = isDescendent ? propriety[1..] : propriety,
                        Descendent = isDescendent
                    });
                }
            }

            return listFilter;
        }
    }
}

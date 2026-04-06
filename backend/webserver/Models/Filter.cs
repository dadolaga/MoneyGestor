using logic.Models;
using Mysqlx.Crud;

namespace webserver.Models {
    public class Filter {
        public String Order { get; set; } = "";
        public UInt32 Offset { get; set; } = 0;
        public UInt32 Limit { get; set; } = 100;
        public String Where { get; set; } = "";
    }
}

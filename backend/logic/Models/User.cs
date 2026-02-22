using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class User {
        public UInt64? Id { get; set; }
        public String Firstname { get; set; }
        public String Lastname { get; set; }
        public String Email { get; set; }
        public String Username { get; set; }
        public String? Password { get; set; }
    }
}
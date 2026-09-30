using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class User {
        public UInt64? Id { get; set; }
        public String Firstname { get; set; } = String.Empty;
        public String Lastname { get; set; } = String.Empty;
        public String Email { get; set; } = String.Empty;
        public String Username { get; set; } = String.Empty;
        public String? Password { get; set; }
    }
}
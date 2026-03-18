using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class Type {
        public UInt64? Id { get; set; }
        public String? Name { get; set; }
        public UInt64? UserId { get; set; }
    }
}

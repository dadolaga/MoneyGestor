using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public class Wallet {
        public UInt64? Id { get; set; }
        public String? Name { get; set; }
        public Double? Value { get; set; }
        public Double? CurrentValue { get; set; }
        public Boolean? Favorite { get; set; }
        public Color? Color { get; set; }
    }
}

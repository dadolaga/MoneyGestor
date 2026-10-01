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
        public Decimal? Value { get; set; }
        public Decimal? CurrentValue { get; set; }
        public Boolean? Favorite { get; set; }
        public Color? Color { get; set; }
    }
}
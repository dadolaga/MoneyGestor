using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication.Models {
    internal class Table {
        public String Name { get; set; }

        public IList<Column> Columns { get; set; }
    }
}

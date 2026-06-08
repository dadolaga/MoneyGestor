using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication.Models {
    internal class ExportDetails {
        public String Version { get; set; }
        public IList<TableDetails> Tables { get; set; }
    }

    internal class TableDetails {
        public String Name { get; set; }
        public IList<String> FilePaths { get; set; }
    }
}

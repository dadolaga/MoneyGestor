using ExportImportApplication.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication.Imports {
    internal interface IImport {
        public void Import(ExportDetails exportDetails);
    }
}

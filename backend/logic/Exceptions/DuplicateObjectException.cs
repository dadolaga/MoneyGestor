using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class DuplicateObjectException : DatabaseException {
        public DuplicateObjectException() {
        }

        public DuplicateObjectException(String? message) : base(message) {
        }

        public DuplicateObjectException(String? message, Exception? innerException) : base(message, innerException) {
        }
    }
}
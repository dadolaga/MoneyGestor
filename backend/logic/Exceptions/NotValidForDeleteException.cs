using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class NotValidForDeleteException : DatabaseException {
        public NotValidForDeleteException() {
        }

        public NotValidForDeleteException(String? message) : base(message) {
        }

        public NotValidForDeleteException(String? message, Exception? innerException) : base(message, innerException) {
        }
    }
}

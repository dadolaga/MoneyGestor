using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class DatabaseException : Exception {
        public DatabaseException() {
        }

        public DatabaseException(String? message) : base(message) {
        }

        public DatabaseException(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected DatabaseException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}
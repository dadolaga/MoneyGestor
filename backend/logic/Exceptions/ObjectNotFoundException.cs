using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class ObjectNotFoundException : DatabaseException {
        public ObjectNotFoundException() {
        }

        public ObjectNotFoundException(String? message) : base(message) {
        }

        public ObjectNotFoundException(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected ObjectNotFoundException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}
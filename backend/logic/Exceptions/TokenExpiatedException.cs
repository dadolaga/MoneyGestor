using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class TokenExpiatedException : ExecutorException {
        public TokenExpiatedException() {
        }

        public TokenExpiatedException(String? message) : base(message) {
        }

        public TokenExpiatedException(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected TokenExpiatedException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}
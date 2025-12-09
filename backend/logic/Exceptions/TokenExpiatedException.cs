using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class TokenExpiatedException : Exception {
        public TokenExpiatedException() {
        }

        public TokenExpiatedException(string? message) : base(message) {
        }

        public TokenExpiatedException(string? message, Exception? innerException) : base(message, innerException) {
        }

        protected TokenExpiatedException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}

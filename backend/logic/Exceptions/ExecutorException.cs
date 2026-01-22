using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class ExecutorException : Exception {
        public ExecutorException() {
        }

        public ExecutorException(string? message) : base(message) {
        }

        public ExecutorException(string? message, Exception? innerException) : base(message, innerException) {
        }

        protected ExecutorException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}

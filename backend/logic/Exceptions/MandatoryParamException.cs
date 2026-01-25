using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class MandatoryParamException : Exception {
        public MandatoryParamException() {
        }

        public MandatoryParamException(String? message) : base(message) {
        }

        public MandatoryParamException(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected MandatoryParamException(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}
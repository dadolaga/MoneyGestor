using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class WalletGoesToNegative : ExecutorException {
        public WalletGoesToNegative() {
        }

        public WalletGoesToNegative(String? message) : base(message) {
        }

        public WalletGoesToNegative(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected WalletGoesToNegative(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}

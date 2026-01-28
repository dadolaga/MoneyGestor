using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class UserNotHavePermissionExcpetion : DatabaseException {
        public UserNotHavePermissionExcpetion() {
        }

        public UserNotHavePermissionExcpetion(String? message) : base(message) {
        }

        public UserNotHavePermissionExcpetion(String? message, Exception? innerException) : base(message, innerException) {
        }

        protected UserNotHavePermissionExcpetion(SerializationInfo info, StreamingContext context) : base(info, context) {
        }
    }
}

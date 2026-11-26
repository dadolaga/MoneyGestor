using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Exceptions {
    public class UserPermissionException : DatabaseException {
        public UserPermissionException() {
        }

        public UserPermissionException(String? message) : base(message) {
        }

        public UserPermissionException(String? message, Exception? innerException) : base(message, innerException) {
        }
    }
}
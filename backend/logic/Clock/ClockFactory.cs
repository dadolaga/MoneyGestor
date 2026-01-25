using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Clock {
    public class ClockFactory {
        private static IClock? clock_;

        internal static IClock Clock() {
            clock_ ??= new Clock();

            return clock_;
        }

        public static void Init(IClock clock) => clock_ = clock;
    }
}
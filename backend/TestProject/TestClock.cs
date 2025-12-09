using logic.Clock;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject {
    internal class TestClock : IClock {
        private DateTime now_;

        public DateTime Now { get { return now_; } set { now_ = value; } }

        public TestClock() {
            now_ = DateTime.Now;
        }
    }
}

using logic.Clock;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Base {
    internal abstract class ClockBase {
        protected TestClock Clock { get; private set; }

        [SetUp]
        public void ClockSetup() {
            Clock = new TestClock();

            ClockFactory.Init(Clock);
        }
    }
}
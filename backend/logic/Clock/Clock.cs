using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Clock {
    internal class Clock : IClock {
        public DateTime Now => DateTime.Now;
    }
}
using logic;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Base {
    internal class ExecutorBase : DatabaseBase {
        protected ExecutorManager ExecutorManager { get; private set; }

        [SetUp]
        public void ExecutorSetup() => ExecutorManager = new ExecutorManager();
    }
}
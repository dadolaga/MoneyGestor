using logic.Commands.Transaction;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class TransactionTypeSample {
        public const String DEFAULT_NAME = "Default";

        public String Name { get; init; }

        public AddTransactionTypeCommand AddTransactionTypeCommand { get; init; }

        public TransactionTypeSample(String name = DEFAULT_NAME) {
            this.Name = name;

            AddTransactionTypeCommand = new AddTransactionTypeCommand(name);
        }
    }
}

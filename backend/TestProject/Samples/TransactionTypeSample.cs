using logic.Commands.Transaction;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TestProject.Samples {
    internal class TransactionTypeSample(String name = TransactionTypeSample.DEFAULT_NAME) {
        public const String DEFAULT_NAME = "Default";

        public String Name { get; init; } = name;

        public AddTransactionTypeCommand AddTransactionTypeCommand { get; init; } = new AddTransactionTypeCommand(name);
    }
}
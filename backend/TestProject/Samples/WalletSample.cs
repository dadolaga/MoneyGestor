using logic;
using logic.Commands;
using logic.Commands.Wallets;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TestProject.Commands;

namespace TestProject.Samples {
    internal class WalletSample {
        private const String DEFAULT_NAME = "my_wallet";
        private const Decimal DEFAULT_VALUE = 1000m;
        private const UInt64 DEFAULT_COLOR_ID = 1;

        public AddNewWalletCommand AddWalletCommand { get; private init; }

        public String Name { get; private set; }
        public Decimal Value { get; private set; }
        public UInt64 ColorId { get; private set; }

        public WalletSample(String name = DEFAULT_NAME, Decimal value = DEFAULT_VALUE, UInt64 colorId = DEFAULT_COLOR_ID) {
            Name = name;
            Value = value;
            ColorId = colorId;

            AddWalletCommand = new AddNewWalletCommand(Name, Value, ColorId);
        }
    }
}

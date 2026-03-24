using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic.Models {
    public static class Converter {
        public static User Convert(this UserDb userDb) {
            return new User {
                Id = userDb.Id,
                Firstname = userDb.Firstname,
                Lastname = userDb.Lastname,
                Username = userDb.Username,
                Email = userDb.Email
            };
        }

        public static Color Convert(this ColorDb colorDb) {
            return new Color {
                Id = colorDb.Id,
                Name = colorDb.Name,
                Value = colorDb.Value,
                UserId = colorDb.UserId
            };
        }

        public static Wallet Convert(this WalletDb walletDb) {
            return new Wallet {
                Id = walletDb.Id,
                Name = walletDb.Name,
                Value = walletDb.Value,
                CurrentValue = walletDb.CurrentValue,
                Favorite = walletDb.Favorite,
                Color = walletDb.Color.Convert()
            };
        }

        public static Type Convert(this TransactionTypeDb transactionTypeDb) {
            return new Type {
                Id = transactionTypeDb.Id,
                Name = transactionTypeDb.Name,
                UserId = transactionTypeDb.UserId,
            };
        }

        public static Transaction Convert(this TransactionDb transactionDb) {
            return new Transaction {
                Id = transactionDb.Id,
                Description = transactionDb.Description,
                LongDescription = transactionDb.LongDescription,
                Date = transactionDb.Date,
                Value = transactionDb.Value,
                Wallet = transactionDb.Wallet.Convert(),
                WalletDestination = transactionDb.TransactionDestination?.Wallet?.Convert(),
                TransactionType = transactionDb.TransactionType.Convert(),
                User = transactionDb.User.Convert(),
                UserInsert = transactionDb.UserInsert.Convert(),
            };
        }
    }
}
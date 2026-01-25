using database;
using database.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace logic {
    public class DatabaseInitializer {
        public static readonly ColorDb RED = new() { Id = 1, Name = "Red", Value = UInt32.Parse("ffadad", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb ORANGE = new() { Id = 2, Name = "Orange", Value = UInt32.Parse("ffd6a5", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb YELLOW = new() { Id = 3, Name = "Yellow", Value = UInt32.Parse("fdffb6", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb GREEN = new() { Id = 4, Name = "Green", Value = UInt32.Parse("caffbf", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb CYAN = new() { Id = 5, Name = "Cyan", Value = UInt32.Parse("9bf6ff", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb BLUE = new() { Id = 6, Name = "Blue", Value = UInt32.Parse("a0c4ff", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb PURPLE = new() { Id = 7, Name = "Purple", Value = UInt32.Parse("bdb2ff", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb PINK = new() { Id = 8, Name = "Pink", Value = UInt32.Parse("ffc6ff", System.Globalization.NumberStyles.HexNumber), UserId = null };
        public static readonly ColorDb WHITE = new() { Id = 9, Name = "White", Value = UInt32.Parse("fffffc", System.Globalization.NumberStyles.HexNumber), UserId = null };

        public static async Task Init() {
            using var database = new MoneyGestorContext();
            var transaction = database.Database.BeginTransaction();

            await TryToInsertColor(database, RED);
            await TryToInsertColor(database, ORANGE);
            await TryToInsertColor(database, YELLOW);
            await TryToInsertColor(database, GREEN);
            await TryToInsertColor(database, CYAN);
            await TryToInsertColor(database, BLUE);
            await TryToInsertColor(database, PURPLE);
            await TryToInsertColor(database, PINK);
            await TryToInsertColor(database, WHITE);

            await transaction.CommitAsync();
        }

        private static async Task TryToInsertColor(MoneyGestorContext dbContext, ColorDb color) {
            try {
                await dbContext.AddAsync(color);
                dbContext.Entry(color).Property(c => c.Id).IsModified = true;
                await dbContext.SaveChangesAsync();
            } catch (Exception) {
            }
        }
    }
}

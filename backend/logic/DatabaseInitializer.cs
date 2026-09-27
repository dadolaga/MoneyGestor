using database;
using database.Models;
using Microsoft.EntityFrameworkCore;

namespace logic {
    public class DatabaseInitializer(MoneyGestorContext database) {
        public static ColorDb RED => CreateColor(1, "Red", 0xffadad);
        public static ColorDb ORANGE => CreateColor(2, "Orange", 0xffd6a5);
        public static ColorDb YELLOW => CreateColor(3, "Yellow", 0xfdffb6);
        public static ColorDb GREEN => CreateColor(4, "Green", 0xcaffbf);
        public static ColorDb CYAN => CreateColor(5, "Cyan", 0x9bf6ff);
        public static ColorDb BLUE => CreateColor(6, "Blue", 0xa0c4ff);
        public static ColorDb PURPLE => CreateColor(7, "Purple", 0xbdb2ff);
        public static ColorDb PINK => CreateColor(8, "Pink", 0xffc6ff);
        public static ColorDb WHITE => CreateColor(9, "White", 0xfffffc);

        public static TransactionTypeDb TRANSFER => CreateTransactionType(1, "Transfer");
        public static TransactionTypeDb ADJUSTMENT => CreateTransactionType(2, "Adjustment");

        public async Task InitAsync(CancellationToken cancellationToken = default) {
            await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
            try {
                var desiredColors = CreateColors();
                var colorIds = desiredColors.Select(color => color.Id).ToArray();
                var existingColors = await database.Colors
                    .Where(color => colorIds.Contains(color.Id))
                    .ToDictionaryAsync(color => color.Id, cancellationToken);
                foreach (var desired in desiredColors) {
                    if (existingColors.TryGetValue(desired.Id, out var existing)) {
                        existing.Name = desired.Name;
                        existing.Value = desired.Value;
                        existing.UserId = null;
                    } else {
                        database.Colors.Add(desired);
                    }
                }

                var desiredTypes = CreateTransactionTypes();
                var typeIds = desiredTypes.Select(type => type.Id).ToArray();
                var existingTypes = await database.TransactionTypes
                    .Where(type => typeIds.Contains(type.Id))
                    .ToDictionaryAsync(type => type.Id, cancellationToken);
                foreach (var desired in desiredTypes) {
                    if (existingTypes.TryGetValue(desired.Id, out var existing)) {
                        existing.Name = desired.Name;
                        existing.UserId = null;
                    } else {
                        database.TransactionTypes.Add(desired);
                    }
                }

                await database.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            } catch {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        private static ColorDb[] CreateColors() => [
            RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, PURPLE, PINK, WHITE
        ];

        private static TransactionTypeDb[] CreateTransactionTypes() => [TRANSFER, ADJUSTMENT];

        private static ColorDb CreateColor(UInt64 id, String name, UInt32 value) => new() {
            Id = id,
            Name = name,
            Value = value,
            UserId = null
        };

        private static TransactionTypeDb CreateTransactionType(UInt64 id, String name) => new() {
            Id = id,
            Name = name,
            UserId = null
        };
    }
}

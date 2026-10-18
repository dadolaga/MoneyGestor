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
            await ValidateExistingAsync(requireComplete: false, cancellationToken);
            var colors = await database.Colors.Select(color => color.Id).ToArrayAsync(cancellationToken);
            var types = await database.TransactionTypes.Select(type => type.Id).ToArrayAsync(cancellationToken);
            database.Colors.AddRange(CreateColors().Where(color => !colors.Contains(color.Id)));
            database.TransactionTypes.AddRange(CreateTransactionTypes().Where(type => !types.Contains(type.Id)));
            await database.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        public Task ValidateAsync(CancellationToken cancellationToken = default) =>
            ValidateExistingAsync(requireComplete: true, cancellationToken);

        private async Task ValidateExistingAsync(Boolean requireComplete, CancellationToken cancellationToken) {
            var colors = await database.Colors.AsNoTracking().Where(color => color.Id >= 1 && color.Id <= 9)
                .ToDictionaryAsync(color => color.Id, cancellationToken);
            foreach (var desired in CreateColors()) {
                if (!colors.TryGetValue(desired.Id, out var actual)) {
                    if (requireComplete) {
                        throw new InvalidOperationException("Required global colors are missing. Manual initialization or a verified import is required.");
                    }
                } else if (actual.UserId != null || actual.Name != desired.Name || actual.Value != desired.Value) {
                    throw new InvalidOperationException("A reserved color is inconsistent. Existing data was not overwritten.");
                }
            }

            var types = await database.TransactionTypes.AsNoTracking().Where(type => type.Id == 1 || type.Id == 2)
                .ToDictionaryAsync(type => type.Id, cancellationToken);
            foreach (var desired in CreateTransactionTypes()) {
                if (!types.TryGetValue(desired.Id, out var actual)) {
                    if (requireComplete) {
                        throw new InvalidOperationException("Required global transaction types are missing. Manual initialization or a verified import is required.");
                    }
                } else if (actual.UserId != null || actual.Name != desired.Name || actual.ParentId != null) {
                    throw new InvalidOperationException("A reserved transaction type is inconsistent. Existing data was not overwritten.");
                }
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
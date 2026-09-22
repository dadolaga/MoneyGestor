using database;
using Microsoft.EntityFrameworkCore;

namespace logic {
    public class DatabaseFactory {
        private static Boolean DATABASE_CREATED = false;
        public static MoneyGestorContext Use() {
            var dbContext = new MoneyGestorContext();

            return !dbContext.Database.CanConnect() ? throw new InvalidOperationException("Database not already created") : dbContext;
        }

        public static MoneyGestorContext Create() {
            var dbContext = new MoneyGestorContext();

            DATABASE_CREATED = true;

            return dbContext;
        }
    }
}

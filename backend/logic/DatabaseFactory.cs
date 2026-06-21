using database;
using Microsoft.EntityFrameworkCore;

namespace logic {
    public class DatabaseFactory {
        private static Boolean DATABASE_CREATED = false;
        private static Boolean IN_TEST = false;

        public static void InTest() => IN_TEST = true;

        public static MoneyGestorContext Use() {
            var dbContext = new MoneyGestorContext();

            return !dbContext.Database.CanConnect() ? throw new InvalidOperationException("Database not already created") : dbContext;
        }

        public static MoneyGestorContext Create() {
            if (IN_TEST) {
                MoneyGestorContext.Initialize(
                    host: "localhost",
                    port: 1883,
                    name: "ut_money_gestor",
                    user: "unit_test",
                    password: "psw_ut"
                );
            }

            var dbContext = new MoneyGestorContext();

            DATABASE_CREATED = true;

            return dbContext;
        }
    }
}
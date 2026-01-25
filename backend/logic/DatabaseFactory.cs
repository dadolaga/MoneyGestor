using database;
using Microsoft.EntityFrameworkCore;

namespace logic {
    public class DatabaseFactory {
        private static Boolean databaseCreated_ = false;
        private static Boolean inTest_ = false;

        public static void InTest() => inTest_ = true;

        public static MoneyGestorContext Use() {
            var dbContext = new MoneyGestorContext();

            return !dbContext.Database.CanConnect() ? throw new InvalidOperationException("Database not already created") : dbContext;
        }

        public static MoneyGestorContext Create() {
            if (inTest_) {
                MoneyGestorContext.Initialize(
                    name: "ut_money_gestor",
                    user: "unit_test",
                    password: "psw_ut"
                );
            }

            var dbContext = new MoneyGestorContext();

            if (dbContext.Database.CanConnect()) {
                throw new InvalidOperationException("Database already created");
            }

            databaseCreated_ = true;

            return dbContext;
        }
    }
}
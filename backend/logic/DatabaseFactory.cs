using database;

namespace logic {
    public class DatabaseFactory {
        private static bool databaseCreated_ = false;
        private static bool inTest_ = false;

        public static void InTest() {
            inTest_ = true;
        }

        public static MoneyGestorContext Use() {
            if (!databaseCreated_) {
                throw new InvalidOperationException("Database not already created");
            }

            return new MoneyGestorContext();
        }

        public static MoneyGestorContext Create() {
            if (databaseCreated_) {
                throw new InvalidOperationException("Database already created");
            }

            if (inTest_) {
                MoneyGestorContext.Initialize(
                    name: "ut_money_gestor",
                    user: "unit_test",
                    password: "psw_ut"
                );
            }

            databaseCreated_ = true;

            return new MoneyGestorContext();
        }
    }
}

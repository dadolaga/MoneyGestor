using database;

namespace logic {
    public class DatabaseFactory {

        private static bool inTest_ = false;

        public static void InTest() {
            inTest_ = true;
        }

        public static MoneyGestorContext Create() {
            if (!inTest_) {
                return new MoneyGestorContext();
            }

            MoneyGestorContext.Initialize(
                name: "UNIT_TEST_DB",
                user: "UNIT_TEST_USER",
                password: "UNIT_TEST_PASSWORD"
            );

            return new MoneyGestorContext();
        }
    }
}

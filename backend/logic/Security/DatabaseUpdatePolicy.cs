using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace logic.Security;

internal static class DatabaseUpdatePolicy {
    private const Int32 DuplicateEntryErrorNumber = 1062;

    internal static Boolean IsDuplicateEntry(DbUpdateException exception) {
        for (Exception? current = exception; current != null; current = current.InnerException) {
            if (current is MySqlException { Number: DuplicateEntryErrorNumber }) {
                return true;
            }
        }

        return false;
    }
}

using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace logic.Security;

internal static class DatabaseUpdatePolicy {
    private const Int32 DuplicateEntryErrorNumber = 1062;
    private static readonly Int32[] TransientErrorNumbers = [1205, 1213];

    internal static Boolean IsDuplicateEntry(DbUpdateException exception) {
        for (Exception? current = exception; current != null; current = current.InnerException) {
            if (current is MySqlException { Number: DuplicateEntryErrorNumber }) {
                return true;
            }
        }

        return false;
    }

    internal static Boolean IsRetryable(Exception exception) {
        if (exception is DbUpdateConcurrencyException) {
            return true;
        }

        for (Exception? current = exception; current != null; current = current.InnerException) {
            if (current is MySqlException mysql && TransientErrorNumbers.Contains(mysql.Number)) {
                return true;
            }
        }

        return false;
    }
}

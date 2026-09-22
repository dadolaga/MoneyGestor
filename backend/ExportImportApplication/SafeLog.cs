using Serilog;

namespace ExportImportApplication;

internal static class SafeLog {
    internal static void Error(String operation, Exception exception) {
        Log.Error("{Operation} failed ({ExceptionType})", operation, exception.GetType().Name);
    }
}

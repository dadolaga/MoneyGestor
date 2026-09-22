namespace TestProject.Infrastructure;

internal sealed record TestDatabaseLease(
    String RunId,
    String DatabaseName,
    String Host,
    UInt16 Port,
    String ContainerId);

internal static class TestDatabaseOwnershipGuard {
    internal const String DatabasePrefix = "mg_test_";

    internal static void EnsureOwned(
        TestDatabaseLease lease,
        Boolean testMode,
        String currentRunId,
        String currentDatabaseName,
        String currentHost,
        UInt16 currentPort,
        String currentContainerId) {
        if (!testMode) {
            throw new InvalidOperationException("Test database cleanup refused: test mode is not active.");
        }

        if (String.IsNullOrWhiteSpace(lease.RunId) || lease.RunId != currentRunId) {
            throw new InvalidOperationException("Test database cleanup refused: run ownership mismatch.");
        }

        var expectedDatabaseName = $"{DatabasePrefix}{lease.RunId}";
        if (lease.DatabaseName != expectedDatabaseName || currentDatabaseName != expectedDatabaseName) {
            throw new InvalidOperationException("Test database cleanup refused: database name is not owned by this run.");
        }

        if (String.IsNullOrWhiteSpace(lease.Host) || lease.Host != currentHost || lease.Port != currentPort) {
            throw new InvalidOperationException("Test database cleanup refused: database endpoint mismatch.");
        }

        if (String.IsNullOrWhiteSpace(lease.ContainerId) || lease.ContainerId != currentContainerId) {
            throw new InvalidOperationException("Test database cleanup refused: container ownership mismatch.");
        }
    }
}

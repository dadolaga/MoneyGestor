namespace TestProject.Infrastructure;

[TestFixture]
[Category("Unit")]
internal class TestDatabaseOwnershipGuardTest {
    private const String RunId = "0123456789abcdef0123456789abcdef";
    private static readonly TestDatabaseLease Lease = new(
        RunId,
        $"{TestDatabaseOwnershipGuard.DatabasePrefix}{RunId}",
        "127.0.0.1",
        49152,
        "owned-container-id");

    [Test]
    public void AcceptsResourceOwnedByCurrentRun() {
        Assert.DoesNotThrow(() => TestDatabaseOwnershipGuard.EnsureOwned(
            Lease,
            testMode: true,
            currentRunId: Lease.RunId,
            currentDatabaseName: Lease.DatabaseName,
            currentHost: Lease.Host,
            currentPort: Lease.Port,
            currentContainerId: Lease.ContainerId));
    }

    [TestCase(false, RunId, "mg_test_0123456789abcdef0123456789abcdef", "127.0.0.1", 49152, "owned-container-id")]
    [TestCase(true, "different-run", "mg_test_0123456789abcdef0123456789abcdef", "127.0.0.1", 49152, "owned-container-id")]
    [TestCase(true, RunId, "moneygestor_db", "127.0.0.1", 49152, "owned-container-id")]
    [TestCase(true, RunId, "mg_test_0123456789abcdef0123456789abcdef", "db.internal", 49152, "owned-container-id")]
    [TestCase(true, RunId, "mg_test_0123456789abcdef0123456789abcdef", "127.0.0.1", 3306, "owned-container-id")]
    [TestCase(true, RunId, "mg_test_0123456789abcdef0123456789abcdef", "127.0.0.1", 49152, "foreign-container-id")]
    public void RejectsResourceNotOwnedByCurrentRun(
        Boolean testMode,
        String currentRunId,
        String currentDatabaseName,
        String currentHost,
        Int32 currentPort,
        String currentContainerId) {
        Assert.Throws<InvalidOperationException>(() => TestDatabaseOwnershipGuard.EnsureOwned(
            Lease,
            testMode,
            currentRunId,
            currentDatabaseName,
            currentHost,
            checked((UInt16)currentPort),
            currentContainerId));
    }
}

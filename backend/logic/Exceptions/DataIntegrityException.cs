namespace logic.Exceptions;

public sealed class DataIntegrityException(DataIntegrityReport report) : DatabaseException(report.ToSafeSummary()) {
    public DataIntegrityReport Report { get; } = report;
}

public sealed record DataIntegrityIssue(String Code, IReadOnlyList<UInt64> EntityIds);

public sealed class DataIntegrityReport(IReadOnlyList<DataIntegrityIssue> issues) {
    public IReadOnlyList<DataIntegrityIssue> Issues { get; } = issues;
    public Boolean IsValid => Issues.Count == 0;

    public String ToSafeSummary() {
        if (IsValid) {
            return "Data integrity preflight passed";
        }

        var details = Issues.Select(issue =>
            $"{issue.Code}={issue.EntityIds.Count} [{String.Join(',', issue.EntityIds)}]");
        return $"Data integrity preflight failed: {String.Join("; ", details)}";
    }
}
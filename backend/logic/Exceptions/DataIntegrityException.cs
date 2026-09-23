namespace logic.Exceptions;

public sealed class DataIntegrityException : DatabaseException {
    public DataIntegrityException(DataIntegrityReport report)
        : base(report.ToSafeSummary()) {
        Report = report;
    }

    public DataIntegrityReport Report { get; }
}

public sealed record DataIntegrityIssue(String Code, IReadOnlyList<UInt64> EntityIds);

public sealed class DataIntegrityReport {
    public DataIntegrityReport(IReadOnlyList<DataIntegrityIssue> issues) {
        Issues = issues;
    }

    public IReadOnlyList<DataIntegrityIssue> Issues { get; }
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

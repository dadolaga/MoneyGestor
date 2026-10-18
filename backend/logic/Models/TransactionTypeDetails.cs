namespace logic.Models;

public sealed record TransactionTypeDetails(UInt64? ParentId = null, String Icon = "tag", String Color = "grey",
    String? Description = null, String? Keywords = null, Boolean UseInReports = true);

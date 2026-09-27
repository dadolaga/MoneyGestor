namespace logic.Exceptions;

public sealed class ListFilterValidationException(String field, String reason)
    : Exception("List filter validation failed") {
    public String Field { get; } = field;
    public String Reason { get; } = reason;
}

namespace logic.Exceptions;

public sealed class ResourceValidationException(String field, String reason) : Exception("Resource validation failed") {
    public String Field { get; } = field;
    public String Reason { get; } = reason;
}
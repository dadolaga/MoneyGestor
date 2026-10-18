namespace logic.Exceptions;

public sealed class WalletValidationException(String field, String reason) : ExecutorException(reason) {
    public String Field { get; } = field;
    public String Reason { get; } = reason;
}
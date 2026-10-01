namespace logic.Exceptions;

public sealed class InvalidTransactionException : ExecutorException {
    public InvalidTransactionException(String message) : base(message) {
    }
}
namespace logic.Exceptions;

public sealed class InvalidTransactionException(String message) : ExecutorException(message) {
}
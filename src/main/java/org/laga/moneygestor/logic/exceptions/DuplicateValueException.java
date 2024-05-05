package org.laga.moneygestor.logic.exceptions;

public class DuplicateValueException extends RuntimeException {
    public DuplicateValueException() {
    }

    public DuplicateValueException(String message) {
        super(message);
    }

    public DuplicateValueException(String message, Throwable cause) {
        super(message, cause);
    }

    public DuplicateValueException(Throwable cause) {
        super(cause);
    }
}

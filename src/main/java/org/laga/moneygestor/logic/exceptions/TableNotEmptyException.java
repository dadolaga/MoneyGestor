package org.laga.moneygestor.logic.exceptions;

public class TableNotEmptyException extends RuntimeException {
    public TableNotEmptyException() {
    }

    public TableNotEmptyException(String message) {
        super(message);
    }

    public TableNotEmptyException(String message, Throwable cause) {
        super(message, cause);
    }

    public TableNotEmptyException(Throwable cause) {
        super(cause);
    }
}

package org.laga.moneygestor.logic.exceptions;

public class SameDateMovementException extends RuntimeException {
    public SameDateMovementException() {
    }

    public SameDateMovementException(String message) {
        super(message);
    }

    public SameDateMovementException(String message, Throwable cause) {
        super(message, cause);
    }

    public SameDateMovementException(Throwable cause) {
        super(cause);
    }
}

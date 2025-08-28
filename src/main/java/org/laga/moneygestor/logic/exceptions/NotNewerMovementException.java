package org.laga.moneygestor.logic.exceptions;

public class NotNewerMovementException extends RuntimeException {
    public NotNewerMovementException() {
    }

    public NotNewerMovementException(String message) {
        super(message);
    }

    public NotNewerMovementException(String message, Throwable cause) {
        super(message, cause);
    }

    public NotNewerMovementException(Throwable cause) {
        super(cause);
    }
}

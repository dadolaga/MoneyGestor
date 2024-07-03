package org.laga.moneygestor.exceptions;

public class NotImplementedMethod extends RuntimeException {
    public NotImplementedMethod() {
    }

    public NotImplementedMethod(String message) {
        super(message);
    }

    public NotImplementedMethod(String message, Throwable cause) {
        super(message, cause);
    }

    public NotImplementedMethod(Throwable cause) {
        super(cause);
    }
}

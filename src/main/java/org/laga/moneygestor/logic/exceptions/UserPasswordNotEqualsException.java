package org.laga.moneygestor.logic.exceptions;

public class UserPasswordNotEqualsException extends UserCreationException {
    public UserPasswordNotEqualsException() {
    }

    public UserPasswordNotEqualsException(String message) {
        super(message);
    }

    public UserPasswordNotEqualsException(String message, Throwable cause) {
        super(message, cause);
    }

    public UserPasswordNotEqualsException(Throwable cause) {
        super(cause);
    }
}

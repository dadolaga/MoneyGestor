package org.laga.moneygestor.logic.exceptions;

public class NegativeWalletException extends RuntimeException {
    public NegativeWalletException() {
    }

    public NegativeWalletException(String message) {
        super(message);
    }

    public NegativeWalletException(String message, Throwable cause) {
        super(message, cause);
    }

    public NegativeWalletException(Throwable cause) {
        super(cause);
    }
}

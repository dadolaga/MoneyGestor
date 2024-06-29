package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatus;
public class IllegalArgumentHttpException extends HttpException {
    public IllegalArgumentHttpException() {
        this(null);
    }

    public IllegalArgumentHttpException(String message) {
        this(message, null);
    }

    public IllegalArgumentHttpException(String message, Throwable throwable) {
        super(HttpStatus.BAD_REQUEST, 100, message, throwable);
    }
}

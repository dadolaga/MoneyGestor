package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

public class IllegalArgumentHttpException extends HttpException {
    public IllegalArgumentHttpException() {
        this(null);
    }

    public IllegalArgumentHttpException(String message) {
        super(HttpStatus.BAD_REQUEST, 100, message);
    }
}

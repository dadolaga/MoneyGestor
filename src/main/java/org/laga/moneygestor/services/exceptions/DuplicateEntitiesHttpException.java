package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatus;

public class DuplicateEntitiesHttpException extends HttpException {

    public DuplicateEntitiesHttpException() {
        this(null);
    }

    public DuplicateEntitiesHttpException(String message) {
        this(message, null);
    }

    public DuplicateEntitiesHttpException(String message, Throwable throwable) {
        super(HttpStatus.BAD_REQUEST, 102, message, throwable);
    }
}

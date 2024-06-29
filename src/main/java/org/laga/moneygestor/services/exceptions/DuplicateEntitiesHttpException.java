package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatus;

public class DuplicateEntitiesHttpException extends HttpException {

    public DuplicateEntitiesHttpException() {
        this(null);
    }

    public DuplicateEntitiesHttpException(String message) {
        super(HttpStatus.BAD_REQUEST, 102, message);
    }
}

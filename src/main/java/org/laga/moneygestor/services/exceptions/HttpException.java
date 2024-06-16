package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatusCode;

public class HttpException extends RuntimeException {
    private final HttpStatusCode httpStatusCode;
    private final Integer errorCode;

    public HttpException(Integer errorCode, HttpStatusCode httpStatusCode) {
        this.errorCode = errorCode;
        this.httpStatusCode = httpStatusCode;
    }

    public HttpException(HttpStatusCode httpStatusCode, Integer errorCode, String message) {
        super(message);
        this.httpStatusCode = httpStatusCode;
        this.errorCode = errorCode;
    }

    public HttpStatusCode getHttpStatusCode() {
        return httpStatusCode;
    }

    public Integer getErrorCode() {
        return errorCode;
    }
}

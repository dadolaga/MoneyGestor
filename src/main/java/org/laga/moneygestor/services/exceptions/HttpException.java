package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatusCode;

public class HttpException extends RuntimeException {
    private HttpStatusCode code;
    private Error error;

    public HttpException(HttpStatusCode code, Error error) {
        this.code = code;
        this.error = error;
    }

    public HttpStatusCode getCode() {
        return code;
    }

    public Error getError() {
        return error;
    }
}

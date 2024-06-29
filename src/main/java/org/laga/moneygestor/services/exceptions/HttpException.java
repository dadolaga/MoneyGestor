package org.laga.moneygestor.services.exceptions;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.laga.moneygestor.services.WalletRest;
import org.springframework.http.HttpStatusCode;

public class HttpException extends RuntimeException {
    private final static Logger logger = LogManager.getLogger(WalletRest.class);
    private final HttpStatusCode httpStatusCode;
    private final Integer errorCode;

    public HttpException(Integer errorCode, HttpStatusCode httpStatusCode) {
        this(httpStatusCode, errorCode, null);
    }

    public HttpException(HttpStatusCode httpStatusCode, Integer errorCode, String message) {
        this(httpStatusCode, errorCode, message, null);
    }

    public HttpException(HttpStatusCode httpStatusCode, Integer errorCode, String message, Throwable throwable) {
        super(message, throwable);

        this.httpStatusCode = httpStatusCode;
        this.errorCode = errorCode;

        printOnLogger();
    }

    public HttpStatusCode getHttpStatusCode() {
        return httpStatusCode;
    }

    public Integer getErrorCode() {
        return errorCode;
    }

    private void printOnLogger() {
        String message = String.format("HTTP EXCEPTION: [%s] http_code: %d, message_code: %d, message: \"%s\"",
                this.getClass().getSimpleName(), getHttpStatusCode().value(), getErrorCode(), getMessage());

        logger.error(message);

        if(getCause() != null) {
            StringBuilder traceBuilder = new StringBuilder("Trace of error: \n");

            for (StackTraceElement traceElement : getStackTrace()) {
                traceBuilder.append('\t').append(traceElement).append('\n');
            }

            logger.trace(traceBuilder);
        }
    }
}

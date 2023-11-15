package org.laga.moneygestor.services.exceptions;

public class Error {
    private Integer code;
    private String message;

    public Integer getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public Error(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}

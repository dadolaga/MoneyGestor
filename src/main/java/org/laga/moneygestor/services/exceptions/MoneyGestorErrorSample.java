package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatusCode;

public class MoneyGestorErrorSample {
    public static final HttpException NOT_ALL_FIELD_INSERT = new HttpException(HttpStatusCode.valueOf(400), new Error(1, "not all filed insert"));
    public static final HttpException USER_DUPLICATE_EMAIL = new HttpException(HttpStatusCode.valueOf(400), new Error(101, "duplicate email"));
    public static final HttpException USER_DUPLICATE_USERNAME = new HttpException(HttpStatusCode.valueOf(400), new Error(102, "duplicate username"));
}

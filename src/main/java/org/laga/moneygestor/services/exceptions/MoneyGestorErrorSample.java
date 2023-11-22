package org.laga.moneygestor.services.exceptions;

import org.springframework.http.HttpStatusCode;

public class MoneyGestorErrorSample {
    public static final HttpException NOT_ALL_FIELD_INSERT = new HttpException(HttpStatusCode.valueOf(400), new Error(1, "not all filed insert"));
    public static final HttpException USER_NOT_FOUND = new HttpException(HttpStatusCode.valueOf(400), new Error(2, "user not found"));
    public static final HttpException LOGIN_REQUIRED = new HttpException(HttpStatusCode.valueOf(403), new Error(3, "this page request login"));
    public static final HttpException USER_NOT_HAVE_PERMISSION = new HttpException(HttpStatusCode.valueOf(401), new Error(4, "this user not have permission"));
    public static final HttpException DATABASE_ERROR = new HttpException(HttpStatusCode.valueOf(500), new Error(10, "Database error check log file"));
    public static final HttpException USER_TOKEN_NOT_VALID = new HttpException(HttpStatusCode.valueOf(401), new Error(2, "user not found"));
    public static final HttpException USER_DUPLICATE_EMAIL = new HttpException(HttpStatusCode.valueOf(400), new Error(101, "duplicate email"));
    public static final HttpException USER_DUPLICATE_USERNAME = new HttpException(HttpStatusCode.valueOf(400), new Error(102, "duplicate username"));
    public static final HttpException USER_EMAIL_USERNAME_NOT_EXIST = new HttpException(HttpStatusCode.valueOf(400), new Error(103, "email or username not exist"));
    public static final HttpException USER_PASSWORD_NOT_CORRECT = new HttpException(HttpStatusCode.valueOf(400), new Error(104, "password not correct"));
    public static final HttpException WALLET_WITH_SAME_NAME = new HttpException(HttpStatusCode.valueOf(400), new Error(201, "Duplicate wallet name"));
}

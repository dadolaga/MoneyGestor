package org.laga.moneygestor.services.controller;

import org.laga.moneygestor.logic.exceptions.UserNotFoundException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.models.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(HttpException.class)
    public ResponseEntity<Response> genericException(HttpException ex) {
        Response response = Response.error(ex.getMessage(), ex.getErrorCode());
        return new ResponseEntity<>(response, ex.getHttpStatusCode());
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Response> userNotFoundController() {
        Response response = Response.error("User not found", 101);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }
}

package org.laga.moneygestor.services.controller;

import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.exceptions.Error;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(HttpException.class)
    public ResponseEntity<Error> genericException(HttpException ex) {
        return new ResponseEntity<Error>(ex.getError(), ex.getCode());
    }
}

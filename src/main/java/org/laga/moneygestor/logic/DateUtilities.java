package org.laga.moneygestor.logic;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class DateUtilities {
    private final static DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSX");
    private final static DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    public static LocalDate convertToLocalDate(String date) {
        if (date == null)
            return null;

        try {
            return LocalDate.parse(date, DATE_TIME_FORMATTER);
        } catch (DateTimeParseException ignored) {
            return LocalDate.parse(date, DATE_FORMATTER);
        }
    }

    public static LocalDateTime convertToLocalDateTime(String date) {
        return LocalDateTime.parse(date, DATE_TIME_FORMATTER);
    }
}

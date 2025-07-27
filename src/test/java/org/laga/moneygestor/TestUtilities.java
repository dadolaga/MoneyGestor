package org.laga.moneygestor;

import org.junit.jupiter.api.Assertions;

import java.math.BigDecimal;
import java.util.Random;

public class TestUtilities {
    public static class ObjectSetter<T> {
        T object;

        public ObjectSetter() {
            this(null);
        }
        public ObjectSetter(T object) {
            this.object = object;
        }

        public boolean hasValue() {
            return object != null;
        }

        public T getValue() {
            return object;
        }

        public void setValue(T object) {
            this.object = object;
        }
    }
    public static String generateRandomString(int length) {
        final String letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        final Random random = new Random();

        StringBuilder builder = new StringBuilder(length);

        for(int i = 0; i < length; i++)
            builder.append(letter.charAt(random.nextInt(letter.length())));

        return builder.toString();
    }

    public static String generateEmail() {
        return generateEmail("test");
    }

    public static String generateEmail(String baseWord) {
        return baseWord + "." + generateRandomString(6) + "@test.ts";
    }

    public static void assertionsForFloatNumber(BigDecimal expected, BigDecimal actual, double margin) {
        if(actual.compareTo(expected.subtract(new BigDecimal(margin))) < 0 ||
                actual.compareTo(expected.add(new BigDecimal(margin))) > 0) {
            Assertions.fail("\nExpected :" + expected + "\n" + "Actual   :" + actual + "\nMargin   :" + margin);
        }
    }
}

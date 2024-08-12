package org.laga.moneygestor;

import java.util.Random;

public class TestUtilities {
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
}

package org.laga.moneygestor.logic;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAmount;
import java.util.Base64;
import java.util.Random;

public class TokenUtilities {
    public static final TemporalAmount TOKEN_DURATION = Duration.ofHours(2);

    public static String generateNewToken() {
        return generateRandomString(64);
    }

    private static String generateRandomString(int length) {
        if(length % 4 != 0)
            throw new IllegalArgumentException("length must be divisible for 4");

        byte[] randomString = new byte[(length / 4) * 3];
        new Random().nextBytes(randomString);

        return Base64.getEncoder().encodeToString(randomString).replaceAll("/", "-");
    }
}

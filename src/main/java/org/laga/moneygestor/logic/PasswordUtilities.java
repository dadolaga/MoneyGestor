package org.laga.moneygestor.logic;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.regex.Pattern;

public class PasswordUtilities {
    public static String passwordEncrypt(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");

            byte[] salt = generateSalt(18);

            md.update(salt);

            byte[] passwordHash = md.digest(password.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(passwordHash);

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public static boolean checkPassword(String password, String passwordHash) {
        final String[] passwordSplit = passwordHash.split("\\$");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(Base64.getDecoder().decode(passwordSplit[0]));

            final byte[] newPasswordHash = md.digest(password.getBytes(StandardCharsets.UTF_8));

            return Arrays.equals(Base64.getDecoder().decode(passwordSplit[1]), newPasswordHash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public static boolean checkIsValid(String password) {
        final Pattern upperPattern = Pattern.compile("[A-Z]+");
        final Pattern lowerPattern = Pattern.compile("[a-z]+");
        final Pattern numberPattern = Pattern.compile("[0-9]+");
        final Pattern symbolPattern = Pattern.compile("[-_+?!&$.]+");

        if(password.length() < 8)
            return false;

        if(!upperPattern.matcher(password).find())
            return false;

        if(!lowerPattern.matcher(password).find())
            return false;

        if(!numberPattern.matcher(password).find())
            return false;

        if(!symbolPattern.matcher(password).find())
            return false;

        return true;
    }

    private static byte[] generateSalt(int dimension) {
        byte[] salt = new byte[dimension];

        new SecureRandom().nextBytes(salt);

        return salt;
    }
}

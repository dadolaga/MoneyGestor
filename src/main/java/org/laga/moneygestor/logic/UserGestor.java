package org.laga.moneygestor.logic;

import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.logic.exceptions.UserPasswordNotEqualsException;
import org.laga.moneygestor.services.json.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;

public class UserGestor {
    private Long id;
    private String lastname;
    private String firstname;
    private String username;
    private String email;
    private String token;
    private LocalDateTime expiryToken;
    private String passwordHash;

    private UserGestor(Long id, String lastname, String firstname, String username, String email, String token, LocalDateTime expiryToken, String passwordHash) {
        this.id = id;
        this.lastname = lastname;
        this.firstname = firstname;
        this.username = username;
        this.email = email;
        this.token = token;
        this.expiryToken = expiryToken;
        this.passwordHash = passwordHash;
    }

    public org.laga.moneygestor.db.entity.User getDatabaseUser() {
        org.laga.moneygestor.db.entity.User user = new org.laga.moneygestor.db.entity.User();

        user.setFirstname(firstname);
        user.setLastname(lastname);
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordHash);
        user.setToken(token);
        user.setExpiratedToken(expiryToken);

        return user;
    }

    public class Builder {
        public static UserGestor createFromForm(User user) throws UserCreationException {
            if(user.getLastname().trim().isEmpty() ||
                    user.getFirstname().trim().isEmpty() ||
                    user.getUsername().trim().isEmpty() ||
                    user.getEmail().trim().isEmpty() ||
                    user.getPassword().isEmpty() ||
                    user.getConfirm().isEmpty())
                throw new UserCreationException("All field must be compiled");

            if(!user.getPassword().equals(user.getConfirm()))
                throw new UserPasswordNotEqualsException();

            return new UserGestor(
                    null,
                    user.getLastname(),
                    user.getFirstname(),
                    user.getUsername(),
                    user.getEmail(),
                    null,
                    null,
                    passwordEncrypt(user.getPassword())
            );
        }
    }

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

    private static byte[] generateSalt(int dimension) {
        byte[] salt = new byte[dimension];

        new SecureRandom().nextBytes(salt);

        return salt;
    }
}

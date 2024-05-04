package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.logic.exceptions.UserPasswordNotEqualsException;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.data.domain.Example;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAmount;
import java.util.Arrays;
import java.util.Base64;
import java.util.Random;

public class UserGestor {
    public static final TemporalAmount TOKEN_DURATION = Duration.ofHours(2);
    private Integer id;
    private String lastname;
    private String firstname;
    private String username;
    private String email;
    private String token;
    private LocalDateTime expiryToken;
    private String passwordHash;

    private UserGestor(Integer id, String lastname, String firstname, String username, String email, String token, LocalDateTime expiryToken, String passwordHash) {
        this.id = id;
        this.lastname = lastname;
        this.firstname = firstname;
        this.username = username;
        this.email = email;
        this.token = token;
        this.expiryToken = expiryToken;
        this.passwordHash = passwordHash;
    }

    public Integer getId() {
        return id;
    }

    public String getLastname() {
        return lastname;
    }

    public String getFirstname() {
        return firstname;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getToken() {
        return token;
    }

    public LocalDateTime getExpiryToken() {
        return expiryToken;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserDb getDatabaseUser() {
        UserDb user = new UserDb();

        user.setFirstname(firstname);
        user.setLastname(lastname);
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordHash);
        user.setToken(token);
        user.setExpiratedToken(expiryToken);

        return user;
    }

    public boolean checkPassword(String password) {
        return checkPassword(password, passwordHash);
    }

    public void generateNewToken() {
        token = generateRandomString(64);
        refreshToken();
    }

    public void refreshToken() {
        expiryToken = LocalDateTime.now().plus(TOKEN_DURATION);
    }

    public org.laga.moneygestor.services.models.User generateReturnUser() {
        return new org.laga.moneygestor.services.models.User(lastname, firstname, token, expiryToken);
    }

    public boolean tokenIsValid() {
        if(token == null)
            return true;

        if(expiryToken == null)
            throw new IllegalArgumentException("token not null but expiryToken is null. This is impossible");

        return expiryToken.isAfter(LocalDateTime.now());
    }

    private String generateRandomString(int length) {
        if(length % 4 != 0)
            throw new IllegalArgumentException("length must be divisible for 4");

        byte[] randomString = new byte[(length / 4) * 3];
        new Random().nextBytes(randomString);

        return Base64.getEncoder().encodeToString(randomString).replaceAll("/", "-");
    }

    public class Builder {
        public static UserGestor createFromForm(UserRegistrationForm user) throws UserCreationException {
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

        public static UserGestor createFromDB(UserDb user) {
            if(user == null)
                throw new IllegalArgumentException("user not be null");
            return new UserGestor(
                    user.getId(),
                    user.getLastname(),
                    user.getFirstname(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getToken(),
                    user.getExpiratedToken(),
                    user.getPassword()
            );
        }

        public static UserGestor loadFromAuthorization(UserRepository userRepository, String authorization) {
            UserDb user = new UserDb();

            user.setToken(authorization);

            var optionalUser = userRepository.findOne(Example.of(user));

            if(optionalUser.isEmpty())
                throw MoneyGestorErrorSample.mapOfError.get(2); // user not found

            return createFromDB(optionalUser.get());
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

            System.out.println(Arrays.toString(newPasswordHash));
            System.out.println(Arrays.toString(Base64.getDecoder().decode(passwordSplit[1])));
            System.out.println(Arrays.equals(Base64.getDecoder().decode(passwordSplit[1]), newPasswordHash));

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

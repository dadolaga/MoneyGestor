package org.laga.moneygestor.gestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.PasswordUtilities;
import org.laga.moneygestor.logic.TokenUtilities;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.*;

import java.time.LocalDateTime;

public class UserGestorTest extends BaseGestorTest {

    private UserGestor gestor;

    @BeforeEach
    public void setup() {
        gestor = new UserGestor(sessionFactory);
    }

    @Test
    public void insert_userEffectiveInserted() {
        var user = createCorrectUser();

        var returnedId = gestor.insert(null, user);

        Assertions.assertEquals(user.getId(), returnedId);

        var userInserted = retrieveUser(user.getId());
        checkUserEqual(user, userInserted);
    }

    @Test
    public void insert_userDuplicateEmail() {
        final String email = "test@test.ts";
        final String username_1 = "test_test_1";
        final String username_2 = "test_test_2";
        final String password = "testing+1";

        var user = createCorrectUser(username_1, email, password);
        var userDuplicate = createCorrectUser(username_2, email, password);

        gestor.insert(null, user);

        Assertions.assertThrows(DuplicateValueException.class, () -> gestor.insert(null, userDuplicate));
    }

    @Test
    public void insert_userDuplicateUsername() {
        final String email_1 = "test1@test.ts";
        final String email_2 = "test2@test.ts";
        final String username = "test_test";
        final String password = "testing+1";

        var user = createCorrectUser(username, email_1, password);
        var userDuplicate = createCorrectUser(username, email_2, password);

        gestor.insert(null, user);

        Assertions.assertThrows(DuplicateValueException.class, () -> gestor.insert(null, userDuplicate));
    }

    @Test
    public void deleteById_userDeleted() {
        var user = createCorrectUser();

        gestor.insert(null, user);

        gestor.deleteById(user, user.getId());

        var userInserted = retrieveUser(user.getId());
        Assertions.assertNull(userInserted);
    }

    @Test
    public void deleteById_userNotHavePermission() {
        final String email_1 = "test1@test.ts";
        final String email_2 = "test2@test.ts";
        final String username_1 = "test_test_1";
        final String username_2 = "test_test_2";
        final String password = "testing+1";
        var user_1 = createCorrectUser(username_1, email_1, password);
        var user_2 = createCorrectUser(username_2, email_2, password);

        gestor.insert(null, user_1);

        gestor.insert(null, user_2);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> gestor.deleteById(user_1, user_2.getId()));
    }

    @Test
    public void update_effectiveUpdateUser() {
        createUserLogged();

        var user = createCorrectUser();

        gestor.update(userLogged, userLogged.getId(), user);

        var userUpdated = retrieveUser(userLogged.getId());

        checkUserEqual(user, userUpdated);
    }

    @Test
    public void update_userNotHavePermissionToEdit() {
        createUserLogged();
        createOtherUserLogged();

        var user = createCorrectUser();

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> gestor.update(userLogged, otherUserLogged.getId(), user));
    }

    @Test
    public void getById_effectiveReturnUser() {
        createUserLogged();

        var userFound = gestor.getById(userLogged, userLogged.getId());

        checkUserEqual(userLogged, userFound);
    }

    @Test
    public void getById_notFoundUser() {
        createUserLogged();
        createOtherUserLogged();

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> gestor.deleteById(userLogged, otherUserLogged.getId()));
    }

    @Test
    public void getAll_returnSingleUserLogged() {
        createUserLogged();
        createOtherUserLogged();

        var listOfUser = gestor.getAll(userLogged);

        Assertions.assertEquals(1, listOfUser.size());
        checkUserEqual(userLogged, listOfUser.get(0));
    }

    @Test
    public void getFromAuthorizationToken_authorizationCodeExist() {
        final String token = "code_token";
        final LocalDateTime expiatedTime = LocalDateTime.now().plusMinutes(120);

        createUserLogged(token, expiatedTime);

        var user = gestor.getFromAuthorizationToken(token);

        checkUserEqual(userLogged, user);
    }

    @Test
    public void getFromAuthorizationToken_notUserFond() {
        final String token = "code_token";
        final String tokenNotExist = "token_not_exist";
        final LocalDateTime expiatedTime = LocalDateTime.now().plusMinutes(120);

        createUserLogged(token, expiatedTime);

        Assertions.assertThrows(UserNotFoundException.class, () -> gestor.getFromAuthorizationToken(tokenNotExist));
    }

    @Test
    public void getFromAuthorizationTokenAndCheckToken_loginValid() {
        final String token = "code_token";
        final LocalDateTime expiatedTime = LocalDateTime.now().plusMinutes(120);

        createUserLogged(token, expiatedTime);

        var user = gestor.getFromAuthorizationTokenAndCheckToken(token);

        checkUserEqual(userLogged, user);
    }

    @Test
    public void getFromAuthorizationTokenAndCheckToken_loginNotValid() {
        final String token = TokenUtilities.generateNewToken();
        final LocalDateTime expiatedTime = LocalDateTime.now().minusMinutes(120);

        createUserLogged(token, expiatedTime);

        Assertions.assertThrows(TokenExpiredException.class, () -> gestor.getFromAuthorizationTokenAndCheckToken(token));
    }

    @Test
    public void login_correctUserLoggedForUsername() {
        final String username = "username";
        final String email = "test@email.com";
        final String password = "password";

        var user = new UserDb();
        user.setFirstname("name");
        user.setLastname("surname");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(PasswordUtilities.passwordEncrypt(password));

        addEntity(user);

        var loginData = gestor.login(username, password, false);
        var userFromToken = gestor.getFromAuthorizationToken(loginData.getToken());

        checkUserEqual(user, userFromToken);
    }

    @Test
    public void login_correctUserLoggedForEmail() {
        final String username = "username";
        final String email = "test@email.com";
        final String password = "password";

        var user = new UserDb();
        user.setFirstname("name");
        user.setLastname("surname");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(PasswordUtilities.passwordEncrypt(password));

        addEntity(user);

        var loginData = gestor.login(email, password, false);
        var userFromToken = gestor.getFromAuthorizationToken(loginData.getToken());

        checkUserEqual(user, userFromToken);
    }

    @Test
    public void login_failUserLoginWhenPasswordNotCorrect() {
        final String username = "username";
        final String email = "test@email.com";
        final String password = "password";
        final String passwordError = "not_correct";

        var user = new UserDb();
        user.setFirstname("name");
        user.setLastname("surname");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(PasswordUtilities.passwordEncrypt(password));

        addEntity(user);

        var loginData = gestor.login(username, password, false);
        var userFromToken = gestor.getFromAuthorizationToken(loginData.getToken());

        checkUserEqual(user, userFromToken);

        Assertions.assertThrows(UserPasswordNotEqualsException.class, () -> gestor.login(email, passwordError, false));
    }

    private void checkUserEqual(UserDb expected, UserDb actual) {
        Assertions.assertNotNull(actual);

        Assertions.assertNotEquals(expected.hashCode(), actual.hashCode(), "The object are the same check not valid");

        Assertions.assertEquals(expected.getFirstname(), actual.getFirstname());
        Assertions.assertEquals(expected.getLastname(), actual.getLastname());
        Assertions.assertEquals(expected.getEmail(), actual.getEmail());
        Assertions.assertEquals(expected.getUsername(), actual.getUsername());
        Assertions.assertEquals(expected.getPassword(), actual.getPassword());
    }

    private UserDb retrieveUser(Integer id) {
        try (var session = sessionFactory.openSession()) {
            return session.get(UserDb.class, id);
        } catch (Exception ignored) { }

        return null;
    }

    private static UserDb createCorrectUser() {
        return createCorrectUser("test", "test@example.com", "password");
    }
    private static UserDb createCorrectUser(String username, String email, String password) {
        var user = new UserDb();

        user.setFirstname("test");
        user.setLastname("test");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);

        return user;
    }
}

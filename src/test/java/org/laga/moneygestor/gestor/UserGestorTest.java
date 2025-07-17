package org.laga.moneygestor.gestor;

import org.hibernate.HibernateException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.LoginDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.PasswordUtilities;
import org.laga.moneygestor.logic.exceptions.*;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

public class UserGestorTest extends BaseGestorTest<UserDb>{

    @Test
    public void insert_userEffectiveInserted() {
        final Integer EXPECTED_ID = 101;

        var user = createCorrectUser(EXPECTED_ID);

        var returnedId = gestor.insert(null, user);

        Assertions.assertEquals(EXPECTED_ID, returnedId);

        verifySaveEntity();
    }

    @Test
    public void insert_userDuplicateEmail() {
        var user = createCorrectUser();

        Mockito.doThrow(new HibernateException("unique_user_email")).when(session).persist(Mockito.any());

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            gestor.insert(null, user);
        });

        verifyRollbackEntity();
    }

    @Test
    public void insert_userDuplicateUsername() {
        var user = createCorrectUser();

        Mockito.doThrow(new HibernateException("unique_user_username")).when(session).persist(Mockito.any());

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            gestor.insert(null, user);
        });

        verifyRollbackEntity();
    }

    @Test
    public void deleteById_userDeleted() {
        var user = createCorrectUser();

        gestor.deleteById(user, user.getId());

        verifyDeleteEntity();
    }

    @Test
    public void deleteById_userNotHavePermission() {
        final int ID = 1;
        var user = createCorrectUser(ID);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            gestor.deleteById(user, 2);
        });

        verifyRollbackEntity();
    }

    @Test
    public void update_effectiveUpdateUser() {
        final int ID = 1;

        var user = createCorrectUser(ID);

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        gestor.update(user, ID, user);

        verifyUpdateEntity();
    }

    @Test
    public void update_userNotHavePermissionToEdit() {
        final int ID = 1;

        var user = createCorrectUser(ID);

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            gestor.update(user, 2, user);
        });

        verifyRollbackEntity();
    }

    @Test
    public void getById_effectiveReturnUser() {
        var user = createCorrectUser();

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        Assertions.assertEquals(user.getId(), gestor.getById(user, user.getId()).getId());

        verifySelectEntity();
    }

    @Test
    public void getById_notFoundUser() {
        final int ID = 1;
        var user = createCorrectUser(ID);

        Mockito.when(selectQuery.list()).thenReturn(new LinkedList<UserDb>());

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            gestor.deleteById(user, 2);
        });
    }

    @Test
    public void getAll_returnList() {
        Mockito.when(selectQuery.list()).thenReturn(new LinkedList<UserDb>());

        gestor.getAll(createCorrectUser());

        verifySelectEntity();
    }

    @Test
    public void getFromAuthorizationToken_authorizationCodeExist() {
        final int ID = 1;
        final var user = createCorrectUser();

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        var userLogged = gestor.getFromAuthorizationToken("any token is valid");

        Assertions.assertEquals(ID, userLogged.getId());

        verifySelectEntity();
    }

    @Test
    public void getFromAuthorizationToken_notUserFond() {
        final int ID = 1;
        final var user = createCorrectUser();

        Mockito.when(selectQuery.list()).thenReturn(new LinkedList<UserDb>());

        Assertions.assertThrows(UserNotFoundException.class, () -> {
            gestor.getFromAuthorizationToken("any token is valid");
        });
    }

    @Test
    public void getFromAuthorizationTokenAndCheckToken_loginValid() {
        final int ID = 1;
        final String TOKEN = "MyToken";
        final var user = createCorrectUser();

        user.setLogins(Set.of(createCorrectLogin(TOKEN)));

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        var userLogged = gestor.getFromAuthorizationTokenAndCheckToken(TOKEN);

        Assertions.assertEquals(ID, userLogged.getId());

        verifySelectEntity();
    }

    @Test
    public void getFromAuthorizationTokenAndCheckToken_loginNotValid() {
        final int ID = 1;
        final String TOKEN = "MyToken";
        final var user = createCorrectUser();

        user.setLogins(Set.of(createExpiredLogin(TOKEN)));

        Mockito.when(selectQuery.list()).thenReturn(List.of(user));

        Assertions.assertThrows(TokenExpiredException.class, () -> {
            gestor.getFromAuthorizationTokenAndCheckToken(TOKEN);
        });
    }

    @Test
    public void login_correctUserLoggedForUsername() {
        final int ID = 1;
        final String PASSWORD = "password";
        final String PASSWORD_ENCRYPTED = PasswordUtilities.passwordEncrypt(PASSWORD);
        final String USERNAME = "test";
        final UserDb USER = createCorrectUser(ID, USERNAME, null, PASSWORD_ENCRYPTED);

        Mockito.when(selectQuery.list()).thenReturn(List.of(USER));

        gestor.login(USERNAME, PASSWORD, false);

        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).beginTransaction();
        Mockito.verify(session, Mockito.atLeastOnce()).persist(Mockito.any(LoginDb.class));
        Mockito.verify(transaction, Mockito.atLeastOnce()).commit();
    }

    @Test
    public void login_correctUserLoggedForEmail() {
        final int ID = 1;
        final String PASSWORD = "password";
        final String PASSWORD_ENCRYPTED = PasswordUtilities.passwordEncrypt(PASSWORD);
        final String USERNAME = "test";
        final String EMAIL = "test@example.com";
        final UserDb USER = createCorrectUser(ID, USERNAME, EMAIL, PASSWORD_ENCRYPTED);

        Mockito.when(selectQuery.list()).thenReturn(List.of(USER));

        gestor.login(EMAIL, PASSWORD, false);

        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).beginTransaction();
        Mockito.verify(session, Mockito.atLeastOnce()).persist(Mockito.any(LoginDb.class));
        Mockito.verify(transaction, Mockito.atLeastOnce()).commit();
    }

    @Test
    public void login_failUserLoginWhenPasswordNotCorrect() {
        final int ID = 1;
        final String PASSWORD = "password";
        final String PASSWORD_ENCRYPTED = PasswordUtilities.passwordEncrypt(PASSWORD);
        final String USERNAME = "test";
        final String EMAIL = "test@example.com";
        final UserDb USER = createCorrectUser(ID, USERNAME, EMAIL, PASSWORD_ENCRYPTED);

        Mockito.when(selectQuery.list()).thenReturn(List.of(USER));

        Assertions.assertThrows(UserPasswordNotEqualsException.class, () -> {
            gestor.login(EMAIL, "Not_correct_password", false);
        });
    }

    private static UserDb createCorrectUser() {
        return createCorrectUser(1);
    }
    private static UserDb createCorrectUser(Integer id) {
        return createCorrectUser(id, "test", "test@example.com", "password");
    }
    private static UserDb createCorrectUser(Integer id, String username, String email, String password) {
        var user = new UserDb();

        user.setId(id);
        user.setFirstname("test");
        user.setLastname("test");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);

        return user;
    }

    private static LoginDb createCorrectLogin(String token) {
        var login = new LoginDb();

        login.setToken(token);
        login.setExpiratedToken(LocalDateTime.now().plusMinutes(60));

        return login;
    }

    private static LoginDb createExpiredLogin(String token) {
        var login = new LoginDb();

        login.setToken(token);
        login.setExpiratedToken(LocalDateTime.now().minusMinutes(60));

        return login;
    }

    @Override
    protected Class<UserDb> getInnerClass() {
        return UserDb.class;
    }
}

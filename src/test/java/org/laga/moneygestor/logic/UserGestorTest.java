package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.exceptions.*;
import org.laga.moneygestor.services.models.UserRegistrationForm;

import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;

public class UserGestorTest extends LogicBaseTest {
    private UserDb userDb;
    private UserGestor userGestor;

    private List<String> keyToDelete;

    @BeforeEach
    public void initializeUser() {
        keyToDelete = new LinkedList<>();

        userGestor = new UserGestor(sessionFactory);

        userDb = new UserDb();

        userDb.setFirstname("Test");
        userDb.setLastname("User");
        userDb.setUsername("TestSuit_" + TestUtilities.generateRandomString(6));
        userDb.setPassword("ThisIsNotEncrypt");
        userDb.setEmail(TestUtilities.generateEmail());

        keyToDelete.add(userDb.getEmail());
    }

    @Test
    public void insert_userNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            userGestor.insert(null, null);
        });
    }

    @Test
    public void insert_effectiveInsert() {
        userGestor.insert(null, userDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb WHERE email = :email", UserDb.class);
            query.setParameter("email", userDb.getEmail());

            Assertions.assertEquals(1, query.list().size());
        }
    }

    @Test
    public void insert_duplicateEmail_throw() {
        userGestor.insert(null, userDb);

        var secondUser = new UserDb();

        secondUser.setFirstname(userDb.getFirstname());
        secondUser.setLastname(userDb.getLastname());
        secondUser.setUsername("ThisIsNewUserNameForTest_" + TestUtilities.generateRandomString(6));
        secondUser.setPassword("ThisIsNotEncrypt");
        secondUser.setEmail(userDb.getEmail());

        keyToDelete.add(secondUser.getEmail());

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            userGestor.insert(null, secondUser);
        });
    }

    @Test
    public void insert_duplicateUsername_throw() {
        userGestor.insert(null, userDb);

        var secondUser = new UserDb();

        secondUser.setFirstname(userDb.getFirstname());
        secondUser.setLastname(userDb.getLastname());
        secondUser.setUsername(userDb.getUsername());
        secondUser.setPassword("ThisIsNotEncrypt");
        secondUser.setEmail(TestUtilities.generateEmail("second.test"));

        keyToDelete.add(secondUser.getEmail());

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            userGestor.insert(null, secondUser);
        });
    }

    @Test
    public void delete_effectiveDelete() {
        insertUser(userDb);

        userGestor.deleteById(userDb, userDb.getId());

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb WHERE email = :email", UserDb.class);
            query.setParameter("email", userDb.getEmail());

            Assertions.assertEquals(0, query.list().size());
        }
    }

    @Test
    public void delete_userNotHavePermission_throw() throws Exception {
        final String email = TestUtilities.generateEmail("second.test");
        insertUser(userDb);

        var secondUser = new UserDb();

        secondUser.setFirstname(userDb.getFirstname());
        secondUser.setLastname(userDb.getLastname());
        secondUser.setUsername("second_username" + TestUtilities.generateRandomString(6));
        secondUser.setPassword("ThisIsNotEncrypt");
        secondUser.setEmail(email);

        keyToDelete.add(email);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            userGestor.deleteById(secondUser, userDb.getId());
        });
    }

    @Test
    public void update_effectiveUpdate() {
        final String usernameEdit = userDb.getFirstname() + "_EDIT";
        insertUser(userDb);

        userDb.setFirstname(usernameEdit);

        userGestor.update(userDb, userDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb WHERE email = :email", UserDb.class);
            query.setParameter("email", userDb.getEmail());

            var userEdited = query.list().get(0);

            Assertions.assertEquals(usernameEdit, userEdited.getFirstname());
        }
    }

    @Test
    public void update_userNotHavePermission_throw() throws Exception {
        final String email = TestUtilities.generateEmail("second.test");
        insertUser(userDb);

        var secondUser = new UserDb();

        secondUser.setFirstname(userDb.getFirstname());
        secondUser.setLastname(userDb.getLastname());
        secondUser.setUsername("second_username" + TestUtilities.generateRandomString(6));
        secondUser.setPassword("ThisIsNotEncrypt");
        secondUser.setEmail(email);

        keyToDelete.add(secondUser.getEmail());

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            userGestor.update(secondUser, userDb);
        });
    }

    @Test
    public void createUser_correctData_returnUserWithDataCorrect() throws UserCreationException {
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Last");
        userForm.setEmail("myemail@test.ts");
        userForm.setUsername("usertest");
        userForm.setPassword("This_Is_My_Password1");
        userForm.setConfirm("This_Is_My_Password1");

        var userDb = UserGestor.createUserFromRegistrationForm(userForm);

        Assertions.assertAll(
                () -> Assertions.assertEquals(userForm.getFirstname(), userDb.getFirstname()),
                () -> Assertions.assertEquals(userForm.getLastname(), userDb.getLastname()),
                () -> Assertions.assertEquals(userForm.getEmail(), userDb.getEmail()),
                () -> Assertions.assertEquals(userForm.getUsername(), userDb.getUsername()),
                () -> Assertions.assertNull(userDb.getToken()),
                () -> Assertions.assertNull(userDb.getExpiratedToken())
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "giorgio.neriexample.com",   // Missing '@' symbol
            "anna.rossi@@example.com",   // Double '@' symbol
            "chiara. neri@example.com",  // Space in the username
            "andrea.verdi@exam ple.com", // Space in the domain
            ".francesca.rossi@example.com", // Leading dot in the username
            "paolo.verdi.@example.com",  // Trailing dot in the username
            "mario.bianchi!@example.com" // Invalid special character in the username
    })
    public void createUser_emailNotCorrect_throw(String email) {
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Last");
        userForm.setEmail(email);
        userForm.setUsername("usertest");
        userForm.setPassword("This_Is_My_Password1");
        userForm.setConfirm("This_Is_My_Password1");

        Assertions.assertThrows(UserCreationException.class, () -> UserGestor.createUserFromRegistrationForm(userForm));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "short1!",          // Less than 8 characters
            "alllowercase1!",   // No uppercase letter
            "ALLUPPERCASE1!",   // No lowercase letter
            "NoNumber!",        // No number
            "NoSpecialChar1",   // No special character
            "noupperlower1!",   // No uppercase letter, only lowercase
            "12345678!",        // No uppercase or lowercase letter
            "NoSpecialChar1",   // No special character
            "Short1",           // Less than 8 characters
            "NOLOWERCASE123!"   // No lowercase letter
    })
    public void createUser_passwordNotCorrect_throw(String password) {
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Last");
        userForm.setEmail("test@test.ts");
        userForm.setUsername("usertest");
        userForm.setPassword(password);
        userForm.setConfirm(password);

        Assertions.assertThrows(UserCreationException.class, () -> UserGestor.createUserFromRegistrationForm(userForm));
    }

    @Test
    public void createUser_passwordNotEqual_throw() {
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Last");
        userForm.setEmail("test@test.ts");
        userForm.setUsername("usertest");
        userForm.setPassword("This_Is_My_Password1");
        userForm.setConfirm("This_Is_My_Password2");

        Assertions.assertThrows(UserPasswordNotEqualsException.class, () -> UserGestor.createUserFromRegistrationForm(userForm));
    }

    @Test
    public void login_correctPasswordSearchByUsername_refreshToken() throws UserCreationException {
        final String username = "userForTest_" + TestUtilities.generateRandomString(6);
        final String email = TestUtilities.generateEmail();
        final String password = "This_Is_My_Password1";
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Test");
        userForm.setEmail(email);
        userForm.setUsername(username);
        userForm.setPassword(password);
        userForm.setConfirm(password);

        keyToDelete.add(email);

        var user = UserGestor.createUserFromRegistrationForm(userForm);

        userGestor.insert(null, user);

        var userLogged = userGestor.login(username, password);

        Assertions.assertAll(
                () -> Assertions.assertEquals(username, userLogged.getUsername()),
                () -> Assertions.assertNotNull(userLogged.getToken()),
                () -> Assertions.assertTrue(userLogged.getExpiratedToken().isAfter(LocalDateTime.now()))
        );
    }

    @Test
    public void login_correctPasswordSearchByEmail_refreshToken() throws UserCreationException {
        final String username = "userForTest_" + TestUtilities.generateRandomString(6);
        final String email = TestUtilities.generateEmail();
        final String password = "This_Is_My_Password1";
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Test");
        userForm.setEmail(email);
        userForm.setUsername(username);
        userForm.setPassword(password);
        userForm.setConfirm(password);

        keyToDelete.add(email);

        var user = UserGestor.createUserFromRegistrationForm(userForm);

        userGestor.insert(null, user);

        var userLogged = userGestor.login(email, password);

        Assertions.assertAll(
                () -> Assertions.assertEquals(email, userLogged.getEmail()),
                () -> Assertions.assertNotNull(userLogged.getToken()),
                () -> Assertions.assertTrue(userLogged.getExpiratedToken().isAfter(LocalDateTime.now()))
        );
    }

    @Test
    public void login_passwordNotEqual_throw() throws UserCreationException {
        final String username = "userForTest_" + TestUtilities.generateRandomString(6);
        final String email = TestUtilities.generateEmail();
        final String password = "This_Is_My_Password1";
        var userForm = new UserRegistrationForm();

        userForm.setFirstname("Test");
        userForm.setLastname("Test");
        userForm.setEmail(email);
        userForm.setUsername(username);
        userForm.setPassword(password);
        userForm.setConfirm(password);

        keyToDelete.add(email);

        var user = UserGestor.createUserFromRegistrationForm(userForm);

        userGestor.insert(null, user);

        Assertions.assertThrows(UserPasswordNotEqualsException.class, () -> userGestor.login(email, "ThisPasswordIsNotCorrect"));
    }

    @Test
    public void login_emailOrUsernameNotFound_throw() throws UserCreationException {
        String usernameOrEmail = TestUtilities.generateEmail("ThisEmailNotExist");
        var userGestor = new UserGestor(sessionFactory);

        Assertions.assertThrows(UserNotFoundException.class, () -> userGestor.login(usernameOrEmail, "Password1!"));
    }

    @AfterEach
    public void deleteUserInsert() {
        for (var toDelete : keyToDelete) {
            deleteUser(toDelete);
        }
    }

    public void deleteUser(String email) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            var query = session.createMutationQuery("DELETE FROM UserDb WHERE email = :email");
            query.setParameter("email", email);

            query.executeUpdate();

            transaction.commit();
        }
    }

    public void insertUser(UserDb userDb) {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            session.persist(userDb);

            transaction.commit();
        }
    }
}

package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

public class UserGestorTest extends LogicBaseTest {
    private UserDb userDb;
    private UserGestor userGestor;

    @BeforeEach
    public void initializeUser() {
        userGestor = new UserGestor(sessionFactory);

        userDb = new UserDb();

        userDb.setFirstname("Test");
        userDb.setLastname("User");
        userDb.setUsername("TestSuit_" + TestUtilities.generateRandomString(6));
        userDb.setPassword("ThisIsNotEncrypt");
        userDb.setEmail(TestUtilities.generateEmail());
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

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            userGestor.insert(null, secondUser);
        });

        deleteUser(secondUser.getEmail());
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

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            userGestor.insert(null, secondUser);
        });

        deleteUser(secondUser.getEmail());
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

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            userGestor.deleteById(secondUser, userDb.getId());
        });

        deleteUser(email);
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

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            userGestor.update(secondUser, userDb);
        });

        deleteUser(email);
    }

    @AfterEach
    public void deleteUserInsert() {
        deleteUser(userDb.getEmail());
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

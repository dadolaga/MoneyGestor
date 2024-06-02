package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.util.LinkedList;
import java.util.List;

public class TransactionTypeTest extends UserRequest {
    private TransactionTypeGestor transactionTypeGestor;

    private TransactionTypeDb transactionTypeDb;

    private List<String> allNamesToDelete;

    @BeforeEach
    public void initialize() {
        allNamesToDelete = new LinkedList<>();
        transactionTypeGestor = new TransactionTypeGestor(sessionFactory);

        transactionTypeDb = new TransactionTypeDb();

        transactionTypeDb.setName("Test type " + TestUtilities.generateRandomString(6));
        transactionTypeDb.setUserId(userLogged.getId());

        allNamesToDelete.add(transactionTypeDb.getName());
    }

    @Test
    public void insert_effectiveInsert() {
        transactionTypeDb.setUserId(userLogged.getId());

        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE name = :typeName", TransactionTypeDb.class);
            query.setParameter("typeName", transactionTypeDb.getName());
            TransactionTypeDb transaction= query.getSingleResultOrNull();

            Assertions.assertNotNull(transaction);
        }
    }

    @Test
    public void insert_withoutUserId_effectiveInsert() {
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE name = :typeName", TransactionTypeDb.class);
            query.setParameter("typeName", transactionTypeDb.getName());
            TransactionTypeDb transaction= query.getSingleResultOrNull();

            Assertions.assertEquals(userLogged.getId(), transaction.getUserId());
        }
    }

    @Test
    public void update_effectiveUpdate() {
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        transactionTypeDb.setName(transactionTypeDb.getName() + "_CHANGED");

        allNamesToDelete.add(transactionTypeDb.getName());

        transactionTypeGestor.update(userLogged, transactionTypeDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE id = :id", TransactionTypeDb.class);
            query.setParameter("id", transactionTypeDb.getId());
            TransactionTypeDb transaction = query.getSingleResultOrNull();

            Assertions.assertTrue(transaction.getName().contains("CHANGED"));
        }
    }

    @Test
    public void update_userNotHavePermission_throw() throws Exception {
        final String newUsername = "test_second_user_" + TestUtilities.generateRandomString(6);
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        transactionTypeDb.setName(transactionTypeDb.getName() + "_CHANGED");

        allNamesToDelete.add(transactionTypeDb.getName());

        var secondUserLogger = createAndLoginOtherUser(newUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            transactionTypeGestor.update(secondUserLogger, transactionTypeDb);
        });
    }

    @Test
    public void delete_effectiveDelete() {
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        transactionTypeGestor.deleteById(userLogged, transactionTypeDb.getId());

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE name = :typeName", TransactionTypeDb.class);
            query.setParameter("typeName", transactionTypeDb.getName());
            TransactionTypeDb transaction = query.getSingleResultOrNull();

            Assertions.assertNull(transaction);
        }
    }

    @Test
    public void delete_userNotHavePermission_throw() throws Exception {
        final String newUsername = "test_second_user_" + TestUtilities.generateRandomString(6);
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        var secondUserLogger = createAndLoginOtherUser(newUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            transactionTypeGestor.deleteById(secondUserLogger, transactionTypeDb.getId());
        });
    }

    @Test
    public void getById_correctGet_return() {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            transactionTypeDb.setUserId(userLogged.getId());

            session.persist(transactionTypeDb);

            transaction.commit();
        }

        Assertions.assertEquals(transactionTypeDb.getName(), transactionTypeGestor.getById(userLogged, transactionTypeDb.getId()).getName());
    }

    @Test
    public void getById_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);

        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            transactionTypeDb.setUserId(userLogged.getId());

            session.persist(transactionTypeDb);

            transaction.commit();
        }

        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertNull(transactionTypeGestor.getById(secondUserLogged, transactionTypeDb.getId()));
    }

    @Test
    public void getAll_effectiveReturn_return() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);
        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            transactionTypeDb.setUserId(userLogged.getId());

            session.persist(transactionTypeDb);

            TransactionTypeDb secondType = new TransactionTypeDb();

            secondType.setName(transactionTypeDb.getName());
            secondType.setUserId(secondUserLogged.getId());

            session.persist(secondType);

            transaction.commit();
        }

        Assertions.assertEquals(1, transactionTypeGestor.getAll(userLogged).size());
    }

    @AfterEach
    public void deleteAllWallet() {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var preparedQuery = session.createMutationQuery("DELETE FROM TransactionTypeDb WHERE name = :name");

            for(var name : allNamesToDelete) {
                preparedQuery.setParameter("name", name);

                preparedQuery.executeUpdate();
            }

            transaction.commit();
        }
    }
}

package org.laga.moneygestor.logic.transaction.type;

import org.hibernate.Session;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.logic.TransactionTypeGestor;
import org.laga.moneygestor.logic.UserRequest;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

public class TransactionTypeTest extends UserRequest {
    TransactionTypeGestor transactionTypeGestor;

    TransactionTypeDb transactionTypeDb;

    @BeforeEach
    public void initialize() {
        transactionTypeGestor = new TransactionTypeGestor(sessionFactory);

        transactionTypeDb = new TransactionTypeDb();

        transactionTypeDb.setName("Test type " + TestUtilities.generateRandomString(6));
        transactionTypeDb.setUserId(userLogged.getId());
    }

    @Test
    public void insert_userIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            transactionTypeGestor.insert(null, new TransactionTypeDb());
        });
    }

    @Test
    public void insert_transactionTypeIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            transactionTypeGestor.insert(userLogged, null);
        });
    }

    @Test
    public void insert_effectiveInsert() {
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE name = :typeName", TransactionTypeDb.class);
            query.setParameter("typeName", transactionTypeDb.getName());
            TransactionTypeDb transaction= query.getSingleResultOrNull();

            Assertions.assertNotNull(transaction);
        }
    }

    @Test
    public void delete_userIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            transactionTypeGestor.deleteById(null, 1);
        });
    }

    @Test
    public void delete_idIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            transactionTypeGestor.deleteById(userLogged, null);
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
        final String password = "This_Is_My_New_Password123";
        transactionTypeGestor.insert(userLogged, transactionTypeDb);

        createUser(newUsername, password);
        var loggedNewUser = login(newUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            transactionTypeGestor.deleteById(loggedNewUser, transactionTypeDb.getId());
        });
    }
}

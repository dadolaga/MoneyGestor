package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.jupiter.api.*;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.math.BigDecimal;
import java.util.LinkedList;
import java.util.List;

public class WalletTest extends UserRequest {
    private WalletDb walletDb;

    private List<String> namesToDelete;

    private WalletGestor walletGestor;

    @BeforeEach
    public void initialize() {
        walletGestor = new WalletGestor(sessionFactory);
        namesToDelete = new LinkedList<>();
        walletDb = new WalletDb();

        walletDb.setName("Test_Wallet_" + TestUtilities.generateRandomString(6));
        walletDb.setValue(new BigDecimal(100));
        walletDb.setColor("ffffff");

        namesToDelete.add(walletDb.getName());
    }
    @Test
    public void insert_effectiveInsert() {
        walletDb.setFavorite(false);
        walletDb.setUserId(userLogged.getId());

        walletGestor.insert(userLogged, walletDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
            query.setParameter("walletName", walletDb.getName());
            WalletDb wallet = query.getSingleResultOrNull();

            Assertions.assertNotNull(wallet);
        }
    }

    @Test
    public void insert_returnNewWalletWithId_return() {
        walletDb.setFavorite(false);
        walletDb.setUserId(userLogged.getId());

        Integer id = walletGestor.insert(userLogged, walletDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
            query.setParameter("walletName", walletDb.getName());
            WalletDb wallet = query.getSingleResultOrNull();

            Assertions.assertEquals(wallet.getId(), id);
        }
    }

    @Test
    public void insert_autoInsertUser_return() {
        walletDb.setFavorite(false);

        walletGestor.insert(userLogged, walletDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
            query.setParameter("walletName", walletDb.getName());
            WalletDb wallet = query.getSingleResultOrNull();

            Assertions.assertEquals(userLogged.getId(), wallet.getUserId());
        }
    }

    @Test
    public void insert_autoInsertFavorite_return() {
        walletDb.setUserId(userLogged.getId());

        walletGestor.insert(userLogged, walletDb);

        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
            query.setParameter("walletName", walletDb.getName());
            WalletDb wallet = query.getSingleResultOrNull();

            Assertions.assertFalse(wallet.getFavorite());
        }
    }

    @Test
    public void insert_duplicateName_throw() {
        walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName());
        wallet2.setColor(walletDb.getColor());
        wallet2.setUserId(userLogged.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(walletDb.getValue());

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            walletGestor.insert(userLogged, wallet2);
        });
    }

    @Test
    public void update_idIsNotTheSame_throw() {
        walletGestor.insert(userLogged, walletDb);

        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.update(userLogged, walletDb.getId() + 1, walletDb);
        });
    }

    @Test
    public void update_walletUpdate_effectiveUpdate() {
        final String newText = "This is new test text";
        Integer id = walletGestor.insert(userLogged, walletDb);

        walletDb.setName(newText);

        walletGestor.update(userLogged, id, walletDb);

        try (Session session = sessionFactory.openSession()) {
            Assertions.assertEquals(newText, session.get(WalletDb.class, id).getName());
        }
    }

    @Test
    public void update_changeWithSameName_throw() {
        Integer id = walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName() + "SECOND");
        wallet2.setColor("ff0000");
        wallet2.setUserId(userLogged.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(new BigDecimal(302));

        walletGestor.insert(userLogged, wallet2);

        wallet2.setId(null);

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            walletGestor.update(userLogged, id, wallet2);
        });
    }

    @Test
    public void update_userNotHavePermission_throw() {
        walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        walletDb.setName(walletDb.getName() + "_CHANGED");

        var secondUser = createAndLoginOtherUser("SecondUser_Test_" + TestUtilities.generateRandomString(6));

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            walletGestor.update(secondUser, walletDb.getId(), wallet2);
        });
    }

    @Test
    public void delete_deleteCorrect_effectiveDelete() {
        walletGestor.deleteById(userLogged, walletDb.getId());

        try (Session session = sessionFactory.openSession()) {
            Assertions.assertNull(session.get(WalletDb.class, walletDb.getId()));
        }
    }

    @Test
    public void delete_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);
        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            walletGestor.deleteById(secondUserLogged, walletDb.getId());
        });
    }

    @Test
    public void getById_correctGet_return() {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            walletDb.setFavorite(false);
            walletDb.setUserId(userLogged.getId());

            session.persist(walletDb);

            transaction.commit();
        }

        Assertions.assertEquals(walletDb.getName(), walletGestor.getById(userLogged, walletDb.getId()).getName());
    }

    @Test
    public void getById_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);

        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            walletDb.setFavorite(false);
            walletDb.setUserId(userLogged.getId());

            session.persist(walletDb);

            transaction.commit();
        }

        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> walletGestor.getById(secondUserLogged, walletDb.getId()));
    }

    @Test
    public void getAll_effectiveReturn_return() {
        try (Session session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            walletDb.setFavorite(false);
            walletDb.setUserId(userLogged.getId());

            session.persist(walletDb);

            transaction.commit();
        }

        Assertions.assertEquals(walletDb.getName(), walletGestor.getAll(userLogged).get(0).getName());
    }

    @AfterEach
    public void deleteAllWallet() {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var preparedQuery = session.createMutationQuery("DELETE FROM WalletDb WHERE name = :name");

            for(var name : namesToDelete) {
                preparedQuery.setParameter("name", name);

                preparedQuery.executeUpdate();
            }

            transaction.commit();
        }
    }
}

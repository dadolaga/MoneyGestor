package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.laga.moneygestor.TestUtilities;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedList;
import java.util.List;

public class TransactionGestorTest extends UserRequest {
    private static final double WALLET_VALUE = 100;
    private static final double TRANSACTION_VALUE = 15.20d;
    private TransactionDb transactionDb;
    private TransactionTypeDb transactionTypeDb;
    private WalletDb walletDb;
    private TransactionGestor transactionGestor;
    private List<String> transactionsToDelete;
    private List<WalletDb> walletToDelete;

    @BeforeEach
    public void initialize() {
        transactionTypeDb = createTransactionType(userLogged);
        walletDb = createWallet(userLogged, (int) WALLET_VALUE);

        transactionGestor = new TransactionGestor(sessionFactory);
        transactionsToDelete = new LinkedList<>();

        transactionDb = new TransactionDb();

        transactionDb.setDate(LocalDate.now());
        transactionDb.setDescription("description of transaction " + TestUtilities.generateRandomString(12));
        transactionDb.setTypeId(transactionTypeDb.getId());
        transactionDb.setUserOfTransactionId(userLogged.getId());
        transactionDb.setValue(BigDecimal.valueOf(TRANSACTION_VALUE));
        transactionDb.setWalletId(walletDb.getId());

        transactionsToDelete.add(transactionDb.getDescription());
    }

    private TransactionTypeDb createTransactionType(UserDb userLogged) {
        TransactionTypeDb transactionTypeDb = new TransactionTypeDb();

        transactionTypeDb.setName("test_type_" + TestUtilities.generateRandomString(6));
        transactionTypeDb.setUserId(userLogged.getId());

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.persist(transactionTypeDb);

            transaction.commit();
        }

        return transactionTypeDb;
    }

    private WalletDb createWallet(UserDb userLogged, int value) {
        WalletDb walletDb = new WalletDb();

        walletDb.setName("wallet_test_" + TestUtilities.generateRandomString(6));
        walletDb.setValue(new BigDecimal(value));
        walletDb.setUserId(userLogged.getId());
        walletDb.setColor("ffffff");

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.persist(walletDb);

            transaction.commit();
        }

        walletToDelete.add(walletDb);

        return walletDb;
    }

    @Test
    public void insert_effectiveInsert_descriptionIsSaveOnDb() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());

        transactionGestor.insert(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var transactionInserted = session.createQuery("FROM TransactionDb WHERE id = :id", TransactionDb.class)
                    .setParameter("id", transactionDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(transactionDb.getDescription(), transactionInserted.getDescription());
        }
    }

    @ParameterizedTest
    @ValueSource(doubles = {
            15.32,
            -0.25,
            -63.74,
            63.41,
            52,
            -25
    })
    public void insert_effectiveInsert_walletUpdate(double value) {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setValue(new BigDecimal(value));

        transactionGestor.insert(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var wallet = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(WALLET_VALUE + value, wallet.getValue().doubleValue());
        }
    }

    @Test
    public void insert_walletNegative_throw() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setValue(new BigDecimal(-2845));

        Assertions.assertThrows(NegativeWalletException.class, () -> transactionGestor.insert(userLogged, transactionDb));
    }

    @Test
    public void insert_autoInsertUserInsert_throw() {
        transactionGestor.insert(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var transactionRetrieved = session.createQuery("FROM TransactionDb WHERE id = :id", TransactionDb.class)
                    .setParameter("id", transactionDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(userLogged.getId(), transactionRetrieved.getUserInsertTransactionId());
        }
    }

    @Test
    public void update_effectiveUpdate_descriptionIsUpdateOnDb() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionGestor.insert(userLogged, transactionDb);

        transactionDb.setDescription(transactionDb.getDescription() + "_CHANGED");

        transactionGestor.update(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var transactionInserted = session.createQuery("FROM TransactionDb WHERE id = :id", TransactionDb.class)
                    .setParameter("id", transactionDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertTrue(transactionInserted.getDescription().contains("CHANGED"));
        }
    }

    @Test
    public void update_notChangeValue_walletValueNotChanged() {
        final int TRANSACTION_VALUE = 15;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setValue(new BigDecimal(TRANSACTION_VALUE));

        transactionGestor.insert(userLogged, transactionDb);

        transactionDb.setDescription(transactionDb.getDescription() + "_CHANGED");

        transactionGestor.update(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var wallet = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(WALLET_VALUE + TRANSACTION_VALUE, wallet.getValue().doubleValue());
        }
    }

    @ParameterizedTest
    @ValueSource(doubles = {
            15.32,
            -0.25,
            -63.74,
            63.41,
            52,
            -25
    })
    public void update_changeValue_walletValueChangedCorrect(double value) {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionGestor.insert(userLogged, transactionDb);

        transactionDb.setDescription(transactionDb.getDescription() + "_CHANGED");
        transactionDb.setValue(new BigDecimal(value));

        transactionGestor.update(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var wallet = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(WALLET_VALUE + value, wallet.getValue().doubleValue());
        }
    }

    @Test
    public void update_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionGestor.insert(userLogged, transactionDb);

        transactionDb.setDescription(transactionDb.getDescription() + "_CHANGED");

        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> transactionGestor.update(secondUserLogged, transactionDb));
    }

    @Test
    public void update_walletGoToNegativeValue_throw() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionGestor.insert(userLogged, transactionDb);

        transactionDb.setValue(BigDecimal.valueOf(-15471.21));

        Assertions.assertThrows(NegativeWalletException.class, () -> transactionGestor.update(userLogged, transactionDb));
    }

    @Test
    public void update_moneyTransferUpdateValue_changeValueInBothWallet() {
        final int SECOND_WALLET_VALUE = 312;
        final double VALUE_CHANGED = 49.56;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        transactionDb.setValue(BigDecimal.valueOf(VALUE_CHANGED));

        transactionGestor.update(userLogged, transactionDb);

        try (Session session = sessionFactory.openSession()) {
            var walletWithdraw = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            var walletLayDown = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", secondWallet.getId())
                    .getSingleResultOrNull();

            Assertions.assertAll(
                    () -> Assertions.assertEquals(WALLET_VALUE - VALUE_CHANGED, walletWithdraw.getValue().doubleValue()),
                    () -> Assertions.assertEquals(SECOND_WALLET_VALUE + VALUE_CHANGED, walletLayDown.getValue().doubleValue()),
                    () -> Assertions.assertEquals(VALUE_CHANGED, transactionDb.getTransactionDestination().getValue().doubleValue())
            );
        }
    }

    @Test
    public void update_moneyTransferUpdateDescription_changeDescriptionInOtherTransaction() {
        final int SECOND_WALLET_VALUE = 312;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        transactionDb.setDescription(transactionDb.getDescription() + "_CHANGED");

        transactionGestor.update(userLogged, transactionDb);

        Assertions.assertEquals(transactionDb.getDescription(), transactionDb.getTransactionDestination().getDescription());
    }

    @Test
    public void update_moneyTransferUpdateWallet_allWalletEditIsCorrect() {
        final int SECOND_WALLET_VALUE = 312;
        final int THIRD_WALLET_VALUE = 2013;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);
        var thirdWallet = createWallet(userLogged, THIRD_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        var secondTransaction = transactionDb.getTransactionDestination();

        secondTransaction.setWalletId(thirdWallet.getId());

        transactionGestor.update(userLogged, secondTransaction);

        try (Session session = sessionFactory.openSession()) {
            var walletWithdraw = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            var walletRestore = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", secondWallet.getId())
                    .getSingleResultOrNull();

            var walletLayDown = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", thirdWallet.getId())
                    .getSingleResultOrNull();

            Assertions.assertAll(
                    () -> Assertions.assertEquals(WALLET_VALUE - TRANSACTION_VALUE, walletWithdraw.getValue().doubleValue()),
                    () -> Assertions.assertEquals(SECOND_WALLET_VALUE, walletRestore.getValue().doubleValue()),
                    () -> Assertions.assertEquals(THIRD_WALLET_VALUE + TRANSACTION_VALUE, walletLayDown.getValue().doubleValue())
            );
        }
    }

    @Test
    public void delete_effectiveDelete_transactionEffectiveDelete() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        var idToRemove = transactionGestor.insert(userLogged, transactionDb);

        transactionGestor.deleteById(userLogged, idToRemove);

        try (Session session = sessionFactory.openSession()) {
            var transactionDeleted = session.createQuery("FROM TransactionDb WHERE id = :id", TransactionDb.class)
                    .setParameter("id", transactionDb.getId())
                    .getSingleResultOrNull();

            Assertions.assertNull(transactionDeleted);
        }
    }

    @Test
    public void delete_effectiveDelete_walletValueUpdate() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        var idToRemove = transactionGestor.insert(userLogged, transactionDb);

        transactionGestor.deleteById(userLogged, idToRemove);

        try (Session session = sessionFactory.openSession()) {
            var wallet = session.createQuery("FROM WalletDb WHERE id = :id", TransactionDb.class)
                    .setParameter("id", transactionDb.getWalletId())
                    .getSingleResultOrNull();

            Assertions.assertEquals(WALLET_VALUE, wallet.getValue().doubleValue());
        }
    }

    @Test
    public void delete_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        var idToDelete = transactionGestor.insert(userLogged, transactionDb);

        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> transactionGestor.deleteById(secondUserLogged, idToDelete));
    }

    @Test
    public void delete_moneyTransfer_deleteBothTransaction() {
        final int SECOND_WALLET_VALUE = 312;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        transactionGestor.deleteById(userLogged, transactionDb.getId());

        try (Session session = sessionFactory.openSession()) {
            var listOfTransaction = session.createQuery("FROM TransactionDb WHERE description = :desc", WalletDb.class)
                    .setParameter("desc", transactionDb.getDescription())
                    .list();

            Assertions.assertTrue(listOfTransaction.isEmpty());
        }
    }

    @Test
    public void delete_moneyTransfer_restoreBothWallet() {
        final int SECOND_WALLET_VALUE = 312;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        transactionGestor.deleteById(userLogged, transactionDb.getId());

        try (Session session = sessionFactory.openSession()) {
            var walletWithdraw = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            var walletLayDown = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", secondWallet.getId())
                    .getSingleResultOrNull();

            Assertions.assertAll(
                    () -> Assertions.assertEquals(WALLET_VALUE, walletWithdraw.getValue().doubleValue()),
                    () -> Assertions.assertEquals(SECOND_WALLET_VALUE, walletLayDown.getValue().doubleValue())
            );
        }
    }

    @Test
    public void delete_walletGoToNegativeValue_throw() {
        Assertions.fail("To complete");
    }

    @Test
    public void getById_getEffectiveTransaction_return() {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            transactionDb.setUserOfTransactionId(userLogged.getId());
            transactionDb.setUserInsertTransactionId(userLogged.getId());

            session.persist(transactionDb);

            transaction.commit();
        }

        Assertions.assertEquals(transactionDb.getDescription(), transactionGestor.getById(userLogged, transactionDb.getId()).getDescription());
    }

    @Test
    public void getById_userNotHavePermission_throw() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            transactionDb.setUserOfTransactionId(userLogged.getId());
            transactionDb.setUserInsertTransactionId(userLogged.getId());

            session.persist(transactionDb);

            transaction.commit();
        }

        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> transactionGestor.getById(secondUserLogged, transactionDb.getId()));
    }

    @Test
    public void getAll_getEffectiveMyTransaction_return() {
        final String secondUsername = "SecondUser_Test_" + TestUtilities.generateRandomString(6);
        var secondUserLogged = createAndLoginOtherUser(secondUsername);

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            transactionDb.setUserOfTransactionId(userLogged.getId());
            transactionDb.setUserInsertTransactionId(userLogged.getId());

            session.persist(transactionDb);

            transactionDb.setDescription(transactionDb.getDescription() + "_SECOND");
            transactionDb.setUserOfTransactionId(secondUserLogged.getId());
            transactionDb.setUserInsertTransactionId(secondUserLogged.getId());

            transactionsToDelete.add(transactionDb.getDescription());

            session.persist(transactionDb);

            transaction.commit();
        }

        Assertions.assertEquals(1, transactionGestor.getAll(userLogged).size());
    }

    @Test
    public void moneyTransfer_typeIsNotCorrected_throw() {
        final int SECOND_WALLET_VALUE = 312;

        transactionDb.setUserInsertTransactionId(userLogged.getId());

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        Assertions.assertThrows(IllegalArgumentException.class, () -> transactionGestor.moneyTransfer(transactionDb, secondWallet));
    }

    @Test
    public void moneyTransfer_effectiveInserted_walletValueUpdated() {
        final int SECOND_WALLET_VALUE = 312;

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setType(DatabaseInitializer.TRANSACTION_TYPE_SWITCH);

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionGestor.moneyTransfer(transactionDb, secondWallet);

        try (Session session = sessionFactory.openSession()) {
            var walletWithdraw = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", walletDb.getId())
                    .getSingleResultOrNull();

            var walletLayDown = session.createQuery("FROM WalletDb WHERE id = :id", WalletDb.class)
                    .setParameter("id", secondWallet.getId())
                    .getSingleResultOrNull();

            Assertions.assertAll(
                    () -> Assertions.assertEquals(WALLET_VALUE - TRANSACTION_VALUE, walletWithdraw.getValue().doubleValue()),
                    () -> Assertions.assertEquals(SECOND_WALLET_VALUE + TRANSACTION_VALUE, walletLayDown.getValue().doubleValue())
            );
        }
    }

    @Test
    public void moneyTransfer_walletGoToNegativeValue_throw() {
        final int SECOND_WALLET_VALUE = 12;

        var secondWallet = createWallet(userLogged, SECOND_WALLET_VALUE);

        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setTypeId(DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId());
        transactionDb.setWalletId(secondWallet.getId());

        Assertions.assertThrows(NegativeWalletException.class, () -> transactionGestor.moneyTransfer(transactionDb, walletDb));
    }

    @Test
    public void moneyTransfer_walletIsTheSame_throw() {
        transactionDb.setUserInsertTransactionId(userLogged.getId());
        transactionDb.setTypeId(DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId());

        Assertions.assertThrows(IllegalArgumentException.class, () -> transactionGestor.moneyTransfer(transactionDb, walletDb));
    }

    @AfterEach
    public void deleteTransaction() {
        deleteAllTransaction();
        deleteAllWallet();
        deleteTransactionType(transactionTypeDb);
    }

    private void deleteAllTransaction() {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var preparedQuery = session.createMutationQuery("DELETE FROM TransactionDb WHERE description = :description");

            for(var description : transactionsToDelete) {
                preparedQuery.setParameter("description", description);

                preparedQuery.executeUpdate();
            }

            transaction.commit();
        }
    }

    private void deleteAllWallet() {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            for (var wallet : walletToDelete)
                session.remove(wallet);

            transaction.commit();
        }
    }

    private void deleteTransactionType(TransactionTypeDb transactionTypeDb) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.remove(transactionTypeDb);

            transaction.commit();
        }
    }
}

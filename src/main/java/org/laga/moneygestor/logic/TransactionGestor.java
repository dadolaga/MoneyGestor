package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.Transaction;
import org.laga.moneygestor.utils.CompareUtilities;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

public class TransactionGestor extends Gestor<Long, TransactionDb> {

    public TransactionGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    public Long insertMoneyTransfer(UserDb userLogged, TransactionDb primaryTransaction, WalletDb walletDestination) {
        return insertMoneyTransfer(userLogged, primaryTransaction, walletDestination.getId());
    }

    public Long insertMoneyTransfer(UserDb userLogged, TransactionDb primaryTransaction, Integer walletDestinationId) {
        if(userLogged == null || primaryTransaction == null || walletDestinationId == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(primaryTransaction.getValue() != null && primaryTransaction.getValue().signum() < 0)
            throw new IllegalArgumentException("Value must be positive");

        if (sessionFactory == null)
            throw new SessionException("Session is null");

        if(!Objects.equals(primaryTransaction.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId()))
            throw new IllegalArgumentException("Type of transaction must be SWITCH");

        if(Objects.equals(primaryTransaction.getWalletId(), walletDestinationId))
            throw new IllegalArgumentException("Wallet must be different");

        try (Session session = sessionFactory.openSession()) {
            org.hibernate.Transaction transaction = session.beginTransaction();

            primaryTransaction.setValue(primaryTransaction.getValue().negate());

            Long idPrimaryTransaction = insert(session, userLogged, primaryTransaction, false);

            session.detach(primaryTransaction);

            primaryTransaction.setId(null);
            primaryTransaction.setTransactionDestinationId(idPrimaryTransaction);
            primaryTransaction.setWalletId(walletDestinationId);
            primaryTransaction.setValue(primaryTransaction.getValue().negate());

            Long idSecondaryTransaction = insert(session, userLogged, primaryTransaction, false);

            var transactionInserted = session.get(TransactionDb.class, idPrimaryTransaction);

            transactionInserted.setTransactionDestinationId(idSecondaryTransaction);

            session.persist(transactionInserted);

            transaction.commit();

            return idPrimaryTransaction;
        }
    }

    @Override
    protected Long insert(Session session, UserDb userLogged, TransactionDb transactionDb) {
        return insert(session, userLogged, transactionDb, true);
    }

    private Long insert(Session session, UserDb userLogged, TransactionDb transactionDb, boolean commit) {
        if(session == null || userLogged == null || transactionDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        transactionDb.setUserInsertTransactionId(userLogged.getId());

        try {
            org.hibernate.Transaction transaction = session.getTransaction();

            session.persist(transactionDb);

            updateWalletValue(session, transactionDb.getWalletId(), transactionDb.getValue());

            if(commit)
                transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return transactionDb.getId();
    }

    @Override
    protected void deleteById(Session session, UserDb userLogged, Long id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        org.hibernate.Transaction transaction = session.getTransaction();
        var transactionDb = getById(session, userLogged, id);

        if(transactionDb == null)
            throw new UserNotHavePermissionException();

        updateWalletValue(session, transactionDb.getWalletId(), transactionDb.getValue().negate());
        if(transactionDb.getTransactionDestinationId() != null) {
            var secondaryTransaction = getById(session, userLogged, transactionDb.getTransactionDestinationId());
            updateWalletValue(session, secondaryTransaction.getWalletId(), secondaryTransaction.getValue().negate());
        }

        session.remove(transactionDb);

        transaction.commit();
    }

    @Override
    public void update(UserDb userLogged, TransactionDb newObject) {
        update(userLogged, newObject.getId(), newObject);
    }

    @Override
    protected void update(Session session, UserDb userLogged, Long id, TransactionDb newTransaction) {
        if(sessionFactory == null || id == null || newTransaction == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newTransaction.getId() != null && !Objects.equals(id, newTransaction.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        if(newTransaction.getTransactionDestinationId() != null && newTransaction.getValue().signum() < 0)
            newTransaction.setValue(newTransaction.getValue().negate());

        org.hibernate.Transaction transaction = null;
        try {
            transaction = session.getTransaction();

            TransactionDb transactionDb = getById(session, userLogged, id);

            if(transactionDb == null)
                throw new UserNotHavePermissionException();

            if(transactionDb.getTransactionDestinationId() != null && transactionDb.getValue().signum() > 0)
                throw new IllegalArgumentException("Transaction wrong, must be selected negative transaction when there are a swap");

            if(CompareUtilities.any(transactionDb.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId(), DatabaseInitializer.TRANSACTION_TYPE_TIE.getId())
                    && !CompareUtilities.any(newTransaction.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId(), DatabaseInitializer.TRANSACTION_TYPE_TIE.getId()))
                throw new IllegalArgumentException("Can't convert SWITCH or TIE type to normal type");

            if(CompareUtilities.any(newTransaction.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId(), DatabaseInitializer.TRANSACTION_TYPE_TIE.getId())
                    && !CompareUtilities.any(transactionDb.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId(), DatabaseInitializer.TRANSACTION_TYPE_TIE.getId()))
                throw new IllegalArgumentException("Can't convert normal type to SWITCH or TIE type");

            updateWalletValue(session, transactionDb.getWalletId(), transactionDb.getValue().negate());
            updateWalletValue(session, newTransaction.getWalletId(), newTransaction.getTransactionDestinationId() != null? newTransaction.getValue().negate() : newTransaction.getValue());

            transactionDb.setDescription(newTransaction.getDescription());
            transactionDb.setLongDescription(newTransaction.getLongDescription());
            transactionDb.setDate(newTransaction.getDate());
            transactionDb.setValue(newTransaction.getTransactionDestinationId() != null? newTransaction.getValue().negate() : newTransaction.getValue());
            transactionDb.setWalletId(newTransaction.getWalletId());
            transactionDb.setUserOfTransactionId(newTransaction.getUserOfTransactionId());
            transactionDb.setTypeId(newTransaction.getTypeId());

            session.persist(transactionDb);

            if(transactionDb.getTransactionDestinationId() != null) {
                if(newTransaction.getTransactionDestination() == null)
                    throw new IllegalArgumentException("Transaction destination is must be not null");

                TransactionDb secondaryTransaction = transactionDb.getTransactionDestination();

                updateWalletValue(session, secondaryTransaction.getWalletId(), secondaryTransaction.getValue().negate());
                updateWalletValue(session, newTransaction.getTransactionDestination().getWalletId(), newTransaction.getValue());

                secondaryTransaction.setDescription(newTransaction.getDescription());
                secondaryTransaction.setLongDescription(newTransaction.getLongDescription());
                secondaryTransaction.setDate(newTransaction.getDate());
                secondaryTransaction.setValue(newTransaction.getValue());
                secondaryTransaction.setWalletId(newTransaction.getTransactionDestination().getWalletId());
                secondaryTransaction.setUserOfTransactionId(newTransaction.getUserOfTransactionId());

                session.persist(secondaryTransaction);
            }

            transaction.commit();
        } finally {
            closeTransactionIfNecessary(Objects.requireNonNull(transaction));
        }
    }

    @Override
    protected TransactionDb getById(Session session, UserDb userLogged, Long id) {
        return session.createQuery("FROM TransactionDb WHERE id = : id AND userInsertTransaction = :user", TransactionDb.class)
                .setParameter("id", id)
                .setParameter("user", userLogged)
                .getSingleResultOrNull();
    }

    @Override
    public List<TransactionDb> getAll(Session session, UserDb userLogged) {
        return session.createQuery("FROM TransactionDb WHERE userInsertTransaction = :user", TransactionDb.class)
                .setParameter("user", userLogged)
                .list();
    }

    private void updateWalletValue(Session session, Integer walletId, BigDecimal incrementToWallet) {
        var wallet = session.get(WalletDb.class, walletId);

        wallet.setValue(wallet.getValue().add(incrementToWallet));

        session.persist(wallet);

        if(wallet.getValue().doubleValue() < 0) {
            session.getTransaction().rollback();
            throw new NegativeWalletException();
        }
    }

    public static Transaction convertToRest(TransactionDb transactionDb) {
        Transaction transaction = new Transaction();

        transaction.setId(transactionDb.getId());
        transaction.setDescription(transactionDb.getDescription());
        transaction.setValue(transactionDb.getValue());
        transaction.setWallet(transactionDb.getWallet());
        transaction.setWalletDestination(transactionDb.getTransactionDestination() != null? transactionDb.getTransactionDestination().getWallet() : null);
        transaction.setDate(transactionDb.getDate().format(DateTimeFormatter.ISO_DATE));
        transaction.setType(transactionDb.getType());

        return transaction;
    }

    public static List<Transaction> convertToRest(List<TransactionDb> transactionDbs) {
        List<Transaction> transactions = new LinkedList<>();

        for(var transaction : transactionDbs)
            transactions.add(convertToRest(transaction));

        return transactions;
    }
}

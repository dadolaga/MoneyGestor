package org.laga.moneygestor.logic;

import jakarta.persistence.RollbackException;
import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.*;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.StockOperation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

public class StockOperationGestor extends Gestor<Long, StockOperationDb> {

    public StockOperationGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    public List<StockOperationDb> list(UserDb userLogged, String sortString, Integer limit, Integer page) {
        try (Session session = sessionFactory.openSession()) {
            return session.createQuery("FROM StockOperationDb WHERE userId = :userId "
                            + SortGestor.toSql(sortString), StockOperationDb.class)
                    .setParameter("userId", userLogged.getId())
                    .setFirstResult(page * limit)
                    .setMaxResults(limit)
                    .list();
        }
    }

    public Long insert(UserDb userLogged, StockOperationDb stockOperation, Integer walletId) {
        return insert(userLogged, stockOperation, walletId, false);
    }

    public Long insert(UserDb userLogged, StockOperationDb stockOperation, Integer walletId, boolean forceWalletUpdate) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var id = insert(session, userLogged, stockOperation, walletId, forceWalletUpdate);

            closeTransactionIfNecessary(transaction);

            return id;
        }
    }

    public Long insert(Session session, UserDb userLogged, StockOperationDb stockOperation, Integer walletId, boolean forceWalletUpdate) {
        if(walletId == null) {
            return insert(session, userLogged, stockOperation, true);
        }

        if(userLogged == null || stockOperation == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            var transactionGestor = new TransactionGestor(sessionFactory);
            transactionGestor.setCheckWalletValue(!forceWalletUpdate);

            var transactionDb = new TransactionDb();

            transactionDb.setDate(stockOperation.getDate());
            transactionDb.setValue(stockOperation.getValue());
            transactionDb.setTypeId(DatabaseInitializer.TRANSACTION_TYPE_STOCK.getId());
            transactionDb.setWalletId(walletId);
            transactionDb.setValue(stockOperation.getValue().negate());
            transactionDb.setUserInsertTransactionId(userLogged.getId());
            transactionDb.setUserOfTransactionId(userLogged.getId());

            var transactionId = transactionGestor.insert(session, userLogged, transactionDb, false);

            stockOperation.setBankTransactionId(transactionId);

            var stockOperationId = insert(session, userLogged, stockOperation, false);

            transactionDb.setStockOperationId(stockOperationId);

            transactionGestor.update(session, userLogged, transactionId, transactionDb); // commit is inside this function
            
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return stockOperation.getId();
    }

    @Override
    protected Long insert(Session session, UserDb userLogged, StockOperationDb stockOperationDb) {
        return insert(session, userLogged, stockOperationDb, true);
    }

    @Override
    protected void deleteById(Session session, UserDb userLogged, Long id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction = session.getTransaction();

        StockOperationDb stockOperation = getById(session, userLogged, id);

        if(stockOperation == null)
            throw new UserNotHavePermissionException();

        session.remove(session.contains(stockOperation) ? stockOperation : session.merge(stockOperation));

        transaction.commit();
    }

    @Override
    public void update(UserDb userLogged, StockOperationDb stockOperationDb) {
        update(userLogged, stockOperationDb.getId(), stockOperationDb);
    }

    @Override
    protected void update(Session session, UserDb userLogged, Long id, StockOperationDb newStockOperation) {
        update(session, userLogged, id, newStockOperation, null);
    }

    private void update(Session session, UserDb userLogged, Long id, StockOperationDb newStockOperation, Integer newWallet) {
        if(sessionFactory == null || id == null || newStockOperation == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newStockOperation.getId() != null && !Objects.equals(id, newStockOperation.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        Transaction transaction;
        try {
            transaction = session.getTransaction();
            StockDb stock = session.get(StockDb.class, newStockOperation.getStockId());

            StockOperationDb oldStockOperation = getById(userLogged, id);

            if(oldStockOperation == null)
                throw new UserNotHavePermissionException();

            updateStockCurrentValue(session, stock, stock.getCurrentValue().subtract(oldStockOperation.getValue()).add(newStockOperation.getValue()));

            if (oldStockOperation.getTfr() || oldStockOperation.getBankTransactionId() != null) {
                updateStockResourcesInvested(session, stock, stock.getResourcesInvested().subtract(oldStockOperation.getValue()));
            }

            if (newStockOperation.getTfr() || newStockOperation.getBankTransactionId() != null) {
                updateStockResourcesInvested(session, stock, stock.getResourcesInvested().add(newStockOperation.getValue()));
            }

            if(oldStockOperation.getBankTransactionId() != null) {
                var transactionGestor = new TransactionGestor(sessionFactory);

                var oldTransaction = transactionGestor.getById(session, userLogged, oldStockOperation.getBankTransactionId());
                var newTransaction = new TransactionDb();

                newTransaction.setDescription(oldTransaction.getDescription());
                newTransaction.setLongDescription(oldTransaction.getLongDescription());
                newTransaction.setDate(oldTransaction.getDate());
                newTransaction.setValue(newStockOperation.getValue().negate());
                newTransaction.setWalletId(newWallet != null? newWallet : oldTransaction.getWalletId());
                newTransaction.setUserOfTransactionId(oldTransaction.getUserOfTransactionId());
                newTransaction.setTypeId(oldTransaction.getTypeId());

                oldStockOperation.setBankTransactionId(newWallet != null? oldStockOperation.getBankTransactionId() : null);

                if(newStockOperation.getBankTransactionId() != null) {
                    transactionGestor.update(session, userLogged, oldStockOperation.getBankTransaction().getId(), newTransaction, false);
                } else {
                    transactionGestor.deleteById(session, userLogged, oldTransaction.getId(), true, false);
                }
            } else
                oldStockOperation.setBankTransactionId(newStockOperation.getBankTransactionId());

            oldStockOperation.setDescription(newStockOperation.getDescription() == null? oldStockOperation.getDescription() : newStockOperation.getDescription());
            oldStockOperation.setDate(newStockOperation.getDate() == null? oldStockOperation.getDate() : newStockOperation.getDate());
            oldStockOperation.setStockId(newStockOperation.getStockId() == null? oldStockOperation.getStockId() : newStockOperation.getStockId());
            oldStockOperation.setValue(newStockOperation.getValue() == null? oldStockOperation.getValue() : newStockOperation.getValue());
            oldStockOperation.setTfr(newStockOperation.getTfr() == null? oldStockOperation.getTfr() : newStockOperation.getTfr());
            oldStockOperation.setCurrentStockValue(stock.getCurrentValue());
            oldStockOperation.setCurrentYield(newStockOperation.getTfr() || newStockOperation.getBankTransactionId() != null?
                    null : (newStockOperation.getValue().divide(stock.getCurrentValue().subtract(newStockOperation.getValue()), 10, RoundingMode.HALF_DOWN)));

            session.merge(oldStockOperation);

            transaction.commit();
        } catch (RollbackException e) {
            if(e.getCause().getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }
    }

    public void update(UserDb userLogged, Long id, StockOperationDb newStockOperation, Integer newWalletId) {
        if (newWalletId == null) {
            update(userLogged, id, newStockOperation);
            return;
        }

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var oldStockOperation = session.get(StockOperationDb.class, id);

            if(oldStockOperation.getBankTransactionId() == null) {
                var transactionGestor = new TransactionGestor(sessionFactory);

                var newTransactionDb = new TransactionDb();

                newTransactionDb.setDate(newStockOperation.getDate());
                newTransactionDb.setTypeId(DatabaseInitializer.TRANSACTION_TYPE_STOCK.getId());
                newTransactionDb.setWalletId(newWalletId);
                newTransactionDb.setValue(newStockOperation.getValue().negate());
                newTransactionDb.setUserInsertTransactionId(userLogged.getId());
                newTransactionDb.setUserOfTransactionId(userLogged.getId());
                newTransactionDb.setStockOperationId(id);

                var transactionId = transactionGestor.insert(session, userLogged, newTransactionDb, false);

                newStockOperation.setBankTransactionId(transactionId);
            } else {
                newStockOperation.setBankTransactionId(oldStockOperation.getBankTransactionId());
            }

            update(session, userLogged, id, newStockOperation, newWalletId); // commit is inside this

            closeTransactionIfNecessary(transaction);
        }
    }

    @Override
    protected StockOperationDb getById(Session session, UserDb userLogged, Long id) {
        try {
            return session.createQuery("FROM StockOperationDb WHERE id = :id AND userId = :userId ", StockOperationDb.class)
                    .setParameter("id", id)
                    .setParameter("userId", userLogged.getId())
                    .getSingleResultOrNull();
        } catch (IndexOutOfBoundsException ignored) {
            return null;
        }
    }

    @Override
    public List<StockOperationDb> getAll(Session session, UserDb userLogged) {
        return session.createQuery("FROM StockOperationDb WHERE userId = :userId", StockOperationDb.class)
                .setParameter("userId", userLogged.getId())
                .list();
    }

    private Long insert(Session session, UserDb userLogged, StockOperationDb stockOperationDb, boolean commit) {
        if(userLogged == null || stockOperationDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            Transaction transaction = session.getTransaction();
            var stock = session.get(StockDb.class, stockOperationDb.getStockId());

            stockOperationDb.setUserId(userLogged.getId());
            stockOperationDb.setCurrentStockValue(stock.getCurrentValue().add(stockOperationDb.getValue()));
            stockOperationDb.setTfr(Objects.requireNonNullElse(stockOperationDb.getTfr(), false));

            session.persist(stockOperationDb);

            if(!stockOperationDb.getTfr() && stockOperationDb.getBankTransactionId() == null)
                stockOperationDb.setCurrentYield(stockOperationDb.getValue().divide(stock.getCurrentValue(), 10, RoundingMode.HALF_DOWN));

            updateStockCurrentValue(session, stock, stock.getCurrentValue().add(stockOperationDb.getValue()));

            if(stockOperationDb.getTfr() || stockOperationDb.getBankTransactionId() != null)
                updateStockResourcesInvested(session, stock, stock.getResourcesInvested().add(stockOperationDb.getValue()));

            if (commit)
                transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return stockOperationDb.getId();
    }

    private void updateStockCurrentValue(Session session, StockDb stock, BigDecimal newValue) {
        stock.setCurrentValue(newValue);

        session.persist(stock);
    }

    private void updateStockResourcesInvested (Session session, StockDb stock, BigDecimal newValue) {
        stock.setResourcesInvested(newValue);

        session.persist(stock);
    }

    public static StockOperation convertToRest(StockOperationDb stockOperationDb) {
        var stockOperation = new StockOperation();

        stockOperation.setId( stockOperationDb.getId());
        stockOperation.setDescription(stockOperationDb.getDescription());
        stockOperation.setDate(stockOperationDb.getDate());
        stockOperation.setValue(stockOperationDb.getValue());
        stockOperation.setCurrentYield(stockOperationDb.getCurrentYield());
        stockOperation.setTfr(stockOperationDb.getTfr());
        stockOperation.setBankDeposit(stockOperationDb.getBankTransaction() != null ? TransactionGestor.convertToRest(stockOperationDb.getBankTransaction()) : null);

        return stockOperation;
    }

    public static List<StockOperation> convertToRest(List<StockOperationDb> stockOperationsDb) {
        List<StockOperation> stockOperations = new LinkedList<>();

        for(var stock : stockOperationsDb)
            stockOperations.add(convertToRest(stock));

        return stockOperations;
    }
}

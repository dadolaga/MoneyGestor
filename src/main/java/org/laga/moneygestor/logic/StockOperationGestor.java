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
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            var id = insert(session, userLogged, stockOperation, walletId);

            closeTransactionIfNecessary(transaction);

            return id;
        }
    }

    public Long insert(Session session, UserDb userLogged, StockOperationDb stockOperation, Integer walletId) {
        if(walletId == null) {
            return insert(session, userLogged, stockOperation, true);
        }

        if(userLogged == null || stockOperation == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            Transaction transaction = session.getTransaction();

            var transactionGestor = new TransactionGestor(sessionFactory);

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
        if(sessionFactory == null || id == null || newStockOperation == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newStockOperation.getId() != null && !Objects.equals(id, newStockOperation.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        Transaction transaction;
        try {
            transaction = session.getTransaction();

            StockOperationDb stockOperation = getById(userLogged, id);

            if(stockOperation == null)
                throw new UserNotHavePermissionException();

            stockOperation.setDescription(newStockOperation.getDescription() == null? stockOperation.getDescription() : newStockOperation.getDescription());
            stockOperation.setDate(newStockOperation.getDate() == null? stockOperation.getDate() : newStockOperation.getDate());
            stockOperation.setStockId(newStockOperation.getStockId() == null? stockOperation.getStockId() : newStockOperation.getStockId());
            stockOperation.setValue(newStockOperation.getValue() == null? stockOperation.getValue() : newStockOperation.getValue());
            stockOperation.setBankTransactionId(newStockOperation.getBankTransactionId() == null? stockOperation.getBankTransactionId() : newStockOperation.getBankTransactionId());
            stockOperation.setTfr(newStockOperation.getTfr() == null? stockOperation.getTfr() : newStockOperation.getTfr());

            session.merge(stockOperation);

            transaction.commit();
        } catch (RollbackException e) {
            if(e.getCause().getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }
    }

    @Override
    protected StockOperationDb getById(Session session, UserDb userLogged, Long id) {
        try {
            return session.createQuery("FROM StockOperationDb WHERE id = :id AND userId = :userId ", StockOperationDb.class)
                    .setParameter("id", id)
                    .setParameter("userId", userLogged.getId())
                    .setMaxResults(1)
                    .list().get(0);
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
            stockOperationDb.setTfr(Objects.requireNonNullElse(stockOperationDb.getTfr(), false));

            session.persist(stockOperationDb);

            if(!stockOperationDb.getTfr() && stockOperationDb.getBankTransactionId() == null)
                stockOperationDb.setCurrentYield(stock.getCurrentValue().add(stockOperationDb.getValue()).divide(stock.getCurrentValue(), 10, RoundingMode.HALF_DOWN).subtract(new BigDecimal(1)));

            updateStockCurrentValue(session, stock, stockOperationDb.getValue());

            if(stockOperationDb.getTfr() || stockOperationDb.getBankTransactionId() != null)
                updateStockResourcesInvested(session, session.get(StockDb.class, stockOperationDb.getStockId()), stockOperationDb.getValue());

            if (commit)
                transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return stockOperationDb.getId();
    }

    private void updateStockCurrentValue(Session session, StockDb stock, BigDecimal value) {
        stock.setCurrentValue(stock.getCurrentValue().add(value));

        session.persist(stock);
    }

    private void updateStockResourcesInvested (Session session, StockDb stock, BigDecimal value) {
        stock.setResourcesInvested(stock.getResourcesInvested().add(value));

        session.persist(stock);
    }

    public static StockOperation convertToRest(StockOperationDb stockOperationDb) {
        var stockOperation = new StockOperation();

        stockOperation.setId(stockOperationDb.getId());
        stockOperation.setDescription(stockOperationDb.getDescription());
        stockOperation.setDate(stockOperationDb.getDate());
        stockOperation.setValue(stockOperationDb.getValue());
        stockOperation.setCurrentYield(stockOperationDb.getCurrentYield());
        stockOperation.setTfr(stockOperationDb.getTfr());
        stockOperation.setBankDeposit(stockOperationDb.getBankTransactionId() != null);

        return stockOperation;
    }

    public static List<StockOperation> convertToRest(List<StockOperationDb> stockOperationsDb) {
        List<StockOperation> stockOperations = new LinkedList<>();

        for(var stock : stockOperationsDb)
            stockOperations.add(convertToRest(stock));

        return stockOperations;
    }
}

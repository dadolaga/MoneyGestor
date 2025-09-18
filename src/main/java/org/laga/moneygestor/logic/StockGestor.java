package org.laga.moneygestor.logic;

import jakarta.persistence.RollbackException;
import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.entity.StockDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.Stock;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

public class StockGestor extends Gestor<Integer, StockDb> {
    public StockGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    public List<StockDb> list(UserDb userLogged, String sortString, Integer limit, Integer page) {
        try (Session session = sessionFactory.openSession()) {
            return session.createQuery("FROM StockDb WHERE userId = :userId "
                            + SortGestor.toSql(sortString), StockDb.class)
                    .setParameter("userId", userLogged.getId())
                    .setFirstResult(page * limit)
                    .setMaxResults(limit)
                    .list();
        }
    }

    public BigDecimal getStockValueAtDate(UserDb userLogged, Integer stockId, LocalDate date) {
        try (Session session = sessionFactory.openSession()) {
            var increment = session.createQuery("SELECT sum(value) FROM StockOperationDb WHERE userId = :user AND stockId = :stock AND date >= :date", BigDecimal.class)
                    .setParameter("user", userLogged.getId())
                    .setParameter("stock", stockId)
                    .setParameter("date", date)
                    .getSingleResultOrNull();

            var stock = getById(session, userLogged, stockId);

            if (increment != null)
                return stock.getCurrentValue().subtract(increment);
            else
                return stock.getCurrentValue();
        }
    }

    @Override
    protected Integer insert(Session session, UserDb userLogged, StockDb stockDb) {
        if(userLogged == null || stockDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        stockDb.setUserId(userLogged.getId());

        try {
            Transaction transaction = session.getTransaction();

            stockDb.setCurrentValue(stockDb.getSubscriptionValue());
            stockDb.setResourcesInvested(stockDb.getSubscriptionValue());

            session.persist(stockDb);

            transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return stockDb.getId();
    }

    @Override
    protected void deleteById(Session session, UserDb userLogged, Integer id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction = session.getTransaction();

        StockDb stock = getById(session, userLogged, id);

        if(stock == null)
            throw new UserNotHavePermissionException();

        session.remove(session.contains(stock) ? stock : session.merge(stock));

        transaction.commit();
    }

    @Override
    public void update(UserDb userLogged, StockDb newObject) {
        update(userLogged, newObject.getId(), newObject);
    }

    @Override
    protected void update(Session session, UserDb userLogged, Integer id, StockDb newStock) {
        if(sessionFactory == null || id == null || newStock == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newStock.getId() != null && !Objects.equals(id, newStock.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        Transaction transaction;
        try {
            transaction = session.getTransaction();

            StockDb stock = getById(userLogged, id);

            if(stock == null)
                throw new UserNotHavePermissionException();

            stock.setName(newStock.getName() == null? stock.getName() : newStock.getName());
            stock.setCurrentValue(newStock.getCurrentValue() == null? stock.getCurrentValue() : newStock.getCurrentValue());
            stock.setSubscriptionDate(newStock.getSubscriptionDate() == null? stock.getSubscriptionDate() : newStock.getSubscriptionDate());
            stock.setSubscriptionValue(newStock.getSubscriptionValue() == null? stock.getSubscriptionValue() : newStock.getSubscriptionValue());
            stock.setUserId(newStock.getUserId() == null? stock.getUserId() : newStock.getUserId());

            session.merge(stock);

            transaction.commit();
        } catch (RollbackException e) {
            if(e.getCause().getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }
    }

    @Override
    protected StockDb getById(Session session, UserDb userLogged, Integer id) {
        try {
            return session.createQuery("FROM StockDb WHERE id = :id AND userId = :userId ", StockDb.class)
                    .setParameter("id", id)
                    .setParameter("userId", userLogged.getId())
                    .setMaxResults(1)
                    .list().get(0);
        } catch (IndexOutOfBoundsException ignored) {
            return null;
        }
    }

    @Override
    public List<StockDb> getAll(Session session, UserDb userLogged) {
        return session.createQuery("FROM StockDb WHERE userId = :userId", StockDb.class)
                .setParameter("userId", userLogged.getId())
                .list();
    }

    public static Stock convertToRest(StockDb stockDb) {
        var stock = new Stock();

        stock.setId(stockDb.getId());
        stock.setName(stockDb.getName());
        stock.setSubscriptionDate(stockDb.getSubscriptionDate().format(DateTimeFormatter.ISO_DATE));
        stock.setSubscriptionValue(stockDb.getSubscriptionValue());
        stock.setCurrentValue(stockDb.getCurrentValue());
        stock.setResourcesInvested(stockDb.getResourcesInvested());

        return stock;
    }

    public static List<Stock> convertToRest(List<StockDb> stocksDb) {
        List<Stock> stocks = new LinkedList<>();

        for(var stock : stocksDb)
            stocks.add(convertToRest(stock));

        return stocks;
    }
}

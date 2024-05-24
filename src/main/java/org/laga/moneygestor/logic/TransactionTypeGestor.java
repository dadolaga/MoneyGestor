package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.exceptions.NotImplementedMethod;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.TableNotEmptyException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.util.List;
import java.util.Objects;

public class TransactionTypeGestor implements Gestor<Integer, TransactionTypeDb> {

    SessionFactory sessionFactory;

    public TransactionTypeGestor(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    @Override
    public Integer insert(UserGestor userLogged, TransactionTypeDb transactionTypeDb) {
        if(userLogged == null || transactionTypeDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction;
        try (Session session = sessionFactory.openSession()) {
            transaction = session.beginTransaction();

            session.persist(transactionTypeDb);

            transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_transactionType_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return transactionTypeDb.getId();
    }

    @Override
    public void deleteById(UserGestor userLogged, Integer id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction;

        try (Session session = sessionFactory.openSession()) {
            transaction = session.beginTransaction();

            TransactionTypeDb transactionTypeDb = getById(session, userLogged, id);

            if(transactionTypeDb == null)
                throw new EntityNotFoundException("Wallet with " + id + " not found");

            if(!forceDelete && !transactionTypeDb.getTransaction().isEmpty())
                throw new TableNotEmptyException("transaction table is not empty");

            if(!Objects.equals(userLogged.getId(), transactionTypeDb.getUserId()))
                throw new UserNotHavePermissionException();

            session.remove(session.contains(transactionTypeDb) ? transactionTypeDb : session.merge(transactionTypeDb));

            transaction.commit();
        }
    }

    @Override
    public void update(UserGestor userLogged, TransactionTypeDb newObject) {
        throw new NotImplementedMethod();
    }

    @Override
    public void update(UserGestor userLogged, Integer integer, TransactionTypeDb newObject) {
        throw new NotImplementedMethod();
    }

    @Override
    public TransactionTypeDb getById(UserGestor userLogged, Integer id) {
        try (Session session = sessionFactory.openSession()) {
            return getById(session, userLogged, id);
        }
    }

    private TransactionTypeDb getById(Session session, UserGestor userLogged, Integer id) {
        return session.get(TransactionTypeDb.class, id);
    }

    @Override
    public List<TransactionTypeDb> getAll(UserGestor userLogged) {
        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM TransactionTypeDb WHERE userId = :userId", TransactionTypeDb.class);
            query.setParameter("userId", userLogged.getId());

            return query.list();
        }
    }
}

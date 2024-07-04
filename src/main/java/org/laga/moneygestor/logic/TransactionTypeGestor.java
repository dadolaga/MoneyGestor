package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.TableNotEmptyException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.TransactionType;

import java.util.LinkedList;
import java.util.List;

public class TransactionTypeGestor extends Gestor<Integer, TransactionTypeDb> {

    public static TransactionType convertToRest(TransactionTypeDb transactionTypeDb) {
        var transactionType = new TransactionType();

        transactionType.setId(transactionTypeDb.getId());
        transactionType.setName(transactionTypeDb.getName());

        return transactionType;
    }

    public static List<TransactionType> convertToRest(List<TransactionTypeDb> transactionTypeDbs) {
        List<TransactionType> transactionTypes = new LinkedList<>();

        for(var transactionType : transactionTypeDbs)
            transactionTypes.add(convertToRest(transactionType));

        return transactionTypes;
    }

    public TransactionTypeGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    @Override
    public Integer insert(Session session, UserDb userLogged, TransactionTypeDb transactionTypeDb) {
        if(userLogged == null || transactionTypeDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            Transaction transaction = session.getTransaction();

            session.persist(transactionTypeDb);

            transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_transactionType_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return transactionTypeDb.getId();
    }

    @Override
    public void deleteById(Session session, UserDb userLogged, Integer id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction = session.getTransaction();

        TransactionTypeDb transactionTypeDb = getById(session, userLogged, id);

        if(transactionTypeDb == null)
            throw new UserNotHavePermissionException();

        if(!forceDelete && !transactionTypeDb.getTransaction().isEmpty())
            throw new TableNotEmptyException("transaction table is not empty");

        session.remove(session.contains(transactionTypeDb) ? transactionTypeDb : session.merge(transactionTypeDb));

        transaction.commit();
    }

    @Override
    public void update(UserDb userLogged, TransactionTypeDb newTransactionTypeDb) {
        update(userLogged, newTransactionTypeDb.getId(), newTransactionTypeDb);
    }

    @Override
    public void update(Session session, UserDb userLogged, Integer id, TransactionTypeDb newTransactionTypeDb) {
        if(userLogged == null || newTransactionTypeDb == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            Transaction transaction = session.getTransaction();

            var transactionType = getById(session, userLogged, id);

            if(transactionType == null)
                throw new UserNotHavePermissionException();

            transactionType.setName(newTransactionTypeDb.getName());

            session.persist(transactionType);

            transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_transactionType_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }
    }

    @Override
    public TransactionTypeDb getById(Session session, UserDb userLogged, Integer id) {
        return session.createQuery("FROM TransactionTypeDb WHERE id = :id AND userId = :userId", TransactionTypeDb.class)
                .setParameter("id", id)
                .setParameter("userId", userLogged.getId())
                .getSingleResultOrNull();
    }

    @Override
    public List<TransactionTypeDb> getAll(Session session, UserDb userLogged) {
        return session.createQuery("FROM TransactionTypeDb WHERE userId = :userId OR userId IS NULL", TransactionTypeDb.class)
                .setParameter("userId", userLogged.getId())
                .list();
    }
}

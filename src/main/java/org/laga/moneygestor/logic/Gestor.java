package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.resource.transaction.spi.TransactionStatus;
import org.laga.moneygestor.db.entity.UserDb;

import java.util.List;

public abstract class Gestor<ID, T> {
    protected final SessionFactory sessionFactory;

    protected Gestor(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    /**
     * Insert new object in the database
     * @param object new object to add
     * @return return id of object inserted, <code>null</code> if object not have auto increment id
     */
    public ID insert(UserDb userLogged, T object) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            ID id = insert(session, userLogged, object);

            if(transactionIsToClose(transaction))
                transaction.rollback();

            return id;
        }
    }

    protected abstract ID insert(Session session, UserDb userLogged, T object);


    /**
     * Delete object in the database
     * @param id id of object to delete
     */
    public void deleteById(UserDb userLogged, ID id) {
        deleteById(userLogged, id, false);
    }

    /**
     * Delete object in the database
     * @param id id of object to delete
     * @param forceDelete if <code>true</code> delete object although there are other object connected, <code>false</code> throw excepion
     */
    public void deleteById(UserDb userLogged, ID id, boolean forceDelete) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            deleteById(session, userLogged, id, forceDelete);

            if(transactionIsToClose(transaction))
                transaction.rollback();
        }
    }

    protected abstract void deleteById(Session session, UserDb userLogged, ID id, boolean forceDelete);

    /**
     * Update object in database, where id to update is take by object
     * @param newObject new object
     */
    public abstract void update(UserDb userLogged, T newObject);

    /**
     * Update object in database
     * @param id id of object to update
     * @param newObject new object
     */
    public void update(UserDb userLogged, ID id, T newObject) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            update(session, userLogged, id, newObject);

            if(transactionIsToClose(transaction))
                transaction.rollback();
        }
    }

    protected abstract void update(Session session, UserDb userLogged, ID id, T newObject);

    /**
     * Search object in the database by id
     * @param id id of object to find
     * @return the object found, or <code>null</code> if object not found or user not have permission
     */
    public T getById(UserDb userLogged, ID id) {
        try (Session session = sessionFactory.openSession()) {
            return getById(session, userLogged, id);
        }
    }

    protected abstract T getById(Session session, UserDb userLogged, ID id);


    public List<T> getAll(UserDb userLogged) {
        try (Session session = sessionFactory.openSession()) {
            return getAll(session, userLogged);
        }
    }
    public abstract List<T> getAll(Session session, UserDb userLogged);

    private boolean transactionIsToClose(Transaction transaction) {
        return transaction.getStatus().isOneOf(TransactionStatus.ACTIVE);
    }
}

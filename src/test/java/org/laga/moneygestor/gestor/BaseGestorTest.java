package org.laga.moneygestor.gestor;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.query.MutationQuery;
import org.hibernate.query.Query;
import org.hibernate.resource.transaction.spi.TransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.laga.moneygestor.logic.UserGestor;
import org.mockito.Mockito;

public abstract class BaseGestorTest<T> {
    protected SessionFactory sessionFactory;
    protected Session session;
    protected Transaction transaction;
    protected MutationQuery mutationQuery;
    protected Query selectQuery;
    protected UserGestor gestor;

    @BeforeEach
    public void setup() {
        sessionFactory = Mockito.mock(SessionFactory.class);
        session = Mockito.mock(Session.class);
        transaction = Mockito.mock(Transaction.class);
        mutationQuery = Mockito.mock(MutationQuery.class);
        selectQuery = Mockito.mock(Query.class);

        gestor = new UserGestor(sessionFactory);

        Mockito.when(sessionFactory.openSession()).thenReturn(session);
        Mockito.when(sessionFactory.getCurrentSession()).thenReturn(session);
        Mockito.when(session.beginTransaction()).thenReturn(transaction);
        Mockito.when(session.getTransaction()).thenReturn(transaction);
        Mockito.when(session.createMutationQuery(Mockito.anyString())).thenReturn(mutationQuery);
        Mockito.when(session.createQuery(Mockito.anyString(), Mockito.any())).thenReturn(selectQuery);
        Mockito.when(transaction.getStatus()).thenReturn(TransactionStatus.COMMITTED);
        Mockito.when(mutationQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(mutationQuery);
        Mockito.when(mutationQuery.executeUpdate()).thenReturn(1);
        Mockito.when(selectQuery.setParameter(Mockito.anyString(), Mockito.any())).thenReturn(selectQuery);
        Mockito.when(selectQuery.setMaxResults(Mockito.anyInt())).thenReturn(selectQuery);
    }

    protected void verifySaveEntity() {
        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).beginTransaction();
        Mockito.verify(session, Mockito.atLeastOnce()).persist(Mockito.any(getInnerClass()));
        Mockito.verify(transaction, Mockito.atLeastOnce()).commit();
    }

    protected void verifySelectEntity() {
        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).createQuery(Mockito.anyString(), Mockito.eq(getInnerClass()));
    }

    protected void verifyDeleteEntity() {
        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).beginTransaction();
        Mockito.verify(session, Mockito.atLeastOnce()).createMutationQuery(Mockito.contains("DELETE"));
        Mockito.verify(mutationQuery, Mockito.atLeastOnce()).executeUpdate();
        Mockito.verify(transaction, Mockito.atLeastOnce()).commit();
    }

    protected void verifyUpdateEntity() {
        verifySelectEntity();

        verifySaveEntity();
    }

    protected void verifyRollbackEntity() {
        Mockito.verify(sessionFactory, Mockito.atLeastOnce()).openSession();
        Mockito.verify(session, Mockito.atLeastOnce()).beginTransaction();
        Mockito.verify(transaction, Mockito.atLeastOnce()).rollback();
    }

    protected abstract Class<T> getInnerClass();
}

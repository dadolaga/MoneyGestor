package org.laga.moneygestor.db;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.laga.moneygestor.db.entity.ColorDb;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.utils.CreateEntityValue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    public static final ColorDb COLOR_1 = CreateEntityValue.createColor("912F40");
    public static final ColorDb COLOR_2 = CreateEntityValue.createColor("729B79");
    public static final ColorDb COLOR_3 = CreateEntityValue.createColor("04471C");
    public static final ColorDb COLOR_4 = CreateEntityValue.createColor("C1121F");
    public static final TransactionTypeDb TRANSACTION_TYPE_SWITCH = CreateEntityValue.createTransactionType(1, "Scambio");
    public static final TransactionTypeDb TRANSACTION_TYPE_TIE = CreateEntityValue.createTransactionType(2, "Pareggio");

    private final SessionFactory sessionFactory;

    @Autowired
    public DatabaseInitializer(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            persistIfNotExist(session, COLOR_1, COLOR_1.getColor());
            persistIfNotExist(session, COLOR_2, COLOR_2.getColor());
            persistIfNotExist(session, COLOR_3, COLOR_3.getColor());
            persistIfNotExist(session, COLOR_4, COLOR_4.getColor());

            persistIfNotExist(session, TRANSACTION_TYPE_SWITCH, TRANSACTION_TYPE_SWITCH.getId());
            persistIfNotExist(session, TRANSACTION_TYPE_TIE, TRANSACTION_TYPE_TIE.getId());

            transaction.commit();
        }
    }

    private void persistIfNotExist(Session session, Object value, Object id) {
        if(session.get(value.getClass(), id) == null) {
            session.merge(value);
        }
    }
}

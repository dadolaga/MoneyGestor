package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;

public abstract class BaseRest {
    protected SessionFactory sessionFactory;

    public BaseRest(EntityManagerFactory managerFactory) {
        if(managerFactory.unwrap(SessionFactory.class) == null){
            throw new NullPointerException("factory is not a hibernate factory");
        }

        sessionFactory = managerFactory.unwrap(SessionFactory.class);
    }
}

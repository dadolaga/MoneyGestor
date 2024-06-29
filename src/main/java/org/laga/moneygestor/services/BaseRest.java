package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.SessionFactory;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.TokenExpiredException;
import org.laga.moneygestor.services.exceptions.IllegalArgumentHttpException;

public abstract class BaseRest {
    protected SessionFactory sessionFactory;

    public BaseRest(EntityManagerFactory managerFactory) {
        if(managerFactory.unwrap(SessionFactory.class) == null){
            throw new NullPointerException("factory is not a hibernate factory");
        }

        sessionFactory = managerFactory.unwrap(SessionFactory.class);
    }

    protected UserDb getUserLogged(String authorizationToken) {
        if(authorizationToken == null)
            throw new TokenExpiredException("authorization is empty");

        var userGestor = new UserGestor(sessionFactory);

        try {
            return userGestor.getFromAuthorizationTokenAndCheckToken(authorizationToken);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentHttpException(ex.getMessage(), ex);
        } catch (EntityNotFoundException ex) {
            throw new EntityNotFoundException(ex.getMessage(), ex);
        }
    }
}

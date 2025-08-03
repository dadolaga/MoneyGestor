package org.laga.moneygestor.gestor;

import org.laga.moneygestor.db.entity.LoginDb;
import org.laga.moneygestor.db.entity.UserDb;

import java.time.LocalDateTime;

public abstract class BaseGestorTest extends DatabaseInitializer {

    protected UserDb userLogged;
    protected UserDb otherUserLogged;

    protected void createUserLogged() {
        createUserLogged("user_logged", "user@test.com", "password", "token", LocalDateTime.now().plusMinutes(120), false);
    }

    protected void createOtherUserLogged() {
        createUserLogged("other_user_logged", "other@test.com", "password", "token_other", LocalDateTime.now().plusMinutes(120), true);
    }

    protected void createUserLogged(String token, LocalDateTime expiatedTime) {
        createUserLogged("user_logged", "user@test.com", "password", token, expiatedTime, false);
    }

    private void createUserLogged(String username, String email, String password, String token, LocalDateTime expiatedTime, boolean isOther) {
        var login = new LoginDb();
        login.setToken(token);
        login.setExpiratedToken(expiatedTime);

        var user = new UserDb();
        user.setFirstname("User" + (isOther? "1" : ""));
        user.setLastname("Logged");
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);

        try (var session = sessionFactory.openSession()) {
            var transaction = session.beginTransaction();

            session.persist(user);

            login.setUserId(user.getId());

            session.persist(login);

            transaction.commit();

            if(isOther)
                otherUserLogged = user;
            else
                userLogged = user;
        }
    }
}

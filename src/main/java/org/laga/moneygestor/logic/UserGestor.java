package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.laga.moneygestor.db.entity.LoginDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.exceptions.*;
import org.laga.moneygestor.services.models.LoginData;
import org.laga.moneygestor.services.models.User;
import org.laga.moneygestor.services.models.UserRegistrationForm;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UserGestor extends Gestor<Integer, UserDb> {

    public UserGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    public static UserDb createUserFromRegistrationForm(UserRegistrationForm user) throws UserCreationException {
        if(user.getLastname().trim().isEmpty() ||
                user.getFirstname().trim().isEmpty() ||
                user.getUsername().trim().isEmpty() ||
                user.getEmail().trim().isEmpty() ||
                user.getPassword().isEmpty() ||
                user.getConfirm().isEmpty())
            throw new UserCreationException("All field must be compiled");

        if(!user.getPassword().equals(user.getConfirm()))
            throw new UserPasswordNotEqualsException();

        if(!isValidEmail(user.getEmail()))
            throw new UserCreationException("Not a valid mail insert");

        if(!PasswordUtilities.checkIsValid(user.getPassword()))
            throw new UserCreationException("Not a valid password");

        var userDb = new UserDb();

        userDb.setFirstname(user.getFirstname().trim());
        userDb.setLastname(user.getLastname().trim());
        userDb.setUsername(user.getUsername().trim());
        userDb.setEmail(user.getEmail().trim());
        userDb.setPassword(PasswordUtilities.passwordEncrypt(user.getPassword()));

        return userDb;
    }

    private static boolean isValidEmail(String email) {
        final String regexValidMail = "^(?![.])[A-Za-z0-9._%+-]+(?<![.])@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";

        Pattern pattern = Pattern.compile(regexValidMail);
        Matcher matcher = pattern.matcher(email);
        return matcher.matches();
    }

    public static User convertToRest(UserDb userDb, String token) {
        var user = new User();

        user.setLastname(userDb.getLastname());
        user.setFirstname(userDb.getFirstname());
        user.setToken(token);
        user.setExpireToken(LocalDateTime.now());

        return user;
    }

    public UserDb getFromAuthorizationToken(String authorizationToken) {
        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb u INNER JOIN LoginDb l ON u.id = l.userId WHERE l.token = :token", UserDb.class);
            query.setParameter("token", authorizationToken);

            var listOfUser = query.list();

            if(listOfUser.size() == 0)
                throw new UserNotFoundException();

            if(listOfUser.size() > 1)
                throw new IllegalStateException("More user with token found");

            return listOfUser.get(0);
        } catch (Exception ex) {
            System.out.println(ex);
            throw ex;
        }
    }

    public void checkValidityOfUser(UserDb userDb, String authorizationToken) {
        if(userDb == null || userDb.getLogins().size() == 0)
            throw new IllegalArgumentException();

        if(userDb.getLogins().stream().anyMatch(l -> l.getToken().equals(authorizationToken) && l.getExpiratedToken().isBefore(LocalDateTime.now())))
            throw new TokenExpiredException();
    }

    // TODO insert EntityNotFoundException check when user not found
    public UserDb getFromAuthorizationTokenAndCheckToken(String authorizationToken) {
        var user = getFromAuthorizationToken(authorizationToken);
        checkValidityOfUser(user, authorizationToken);

        return user;
    }

    public LoginData login(String usernameOrMail, String password, boolean rememberUser) {
        try (Session session = sessionFactory.openSession()) {
            var loginData = new LoginData();

            Transaction transaction = session.beginTransaction();

            var query = session.createQuery("FROM UserDb WHERE email LIKE :email OR username LIKE :username", UserDb.class);
            query.setParameter("email", usernameOrMail);
            query.setParameter("username", usernameOrMail);
            query.setMaxResults(1);

            try {
                var userLogged = query.list().get(0);

                if(!PasswordUtilities.checkPassword(password, userLogged.getPassword()))
                    throw new UserPasswordNotEqualsException("Password is not correct");

                var login = new LoginDb();

                login.setUserId(userLogged.getId());
                login.setToken(TokenUtilities.generateNewToken());
                login.setExpiratedToken(LocalDateTime.now().plus(rememberUser ? TokenUtilities.TOKEN_LONG_DURATION
                        : TokenUtilities.TOKEN_DURATION));

                session.persist(login);

                transaction.commit();

                loginData.setName(userLogged.getFirstname());
                loginData.setSurname(userLogged.getLastname());
                loginData.setToken(login.getToken());

                return loginData;
            } catch (IndexOutOfBoundsException e) {
                throw new UserNotFoundException("User not found", e);
            } finally {
                session.getTransaction().rollback();
            }
        }
    }

    public int logout(String authorizationToken) {
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            int count = session.createMutationQuery("DELETE FROM LoginDb WHERE token = :token")
                    .setParameter("token", authorizationToken)
                    .executeUpdate();

            transaction.commit();

            return count;
        }
    }

    @Override
    public Integer insert(Session session, UserDb userLogged, UserDb object) {
        if(object == null)
            throw new IllegalArgumentException();

        Transaction transaction = session.getTransaction();
        try {

            session.persist(object);

            transaction.commit();

            return object.getId();
        } catch (HibernateException e) {
            transaction.rollback();

            if(e.getMessage().contains("unique_user_email"))
                throw new DuplicateValueException("Try to insert duplicate email");

            if(e.getMessage().contains("unique_user_username"))
                throw new DuplicateValueException("Try to insert duplicate username");

            throw e;
        }
    }

    @Override
    public void deleteById(Session session, UserDb userLogged, Integer id, boolean forceDelete) {
        Transaction transaction = session.getTransaction();

        if(!Objects.equals(userLogged.getId(), id)) {
            transaction.rollback();
            throw new UserNotHavePermissionException();
        }

        session.createMutationQuery("DELETE UserDb WHERE id = :id")
                .setParameter("id", id)
                .executeUpdate();

        transaction.commit();
    }

    @Override
    public void update(UserDb userLogged, UserDb newObject) {
        update(userLogged, newObject.getId(), newObject);
    }

    @Override
    public void update(Session session, UserDb userLogged, Integer id, UserDb newUser) {
        if(newUser == null || id == null || userLogged == null)
            throw new IllegalArgumentException();

        Transaction transaction = session.getTransaction();

        if(!Objects.equals(userLogged.getId(), id)) {
            transaction.rollback();
            throw new UserNotHavePermissionException();
        }

        try {
            var user = getById(session, userLogged, id);

            user.setFirstname(newUser.getFirstname());
            user.setLastname(newUser.getLastname());
            user.setUsername(newUser.getUsername());
            user.setEmail(newUser.getEmail());

            session.persist(user);

            transaction.commit();
        } catch (IndexOutOfBoundsException e) {
            transaction.rollback();
            throw new UserNotFoundException(e);
        }
    }

    @Override
    public UserDb getById(Session session, UserDb userLogged, Integer id) {
        try {
            return session.createQuery("FROM UserDb WHERE id = :id", UserDb.class)
                    .setParameter("id", id)
                    .setMaxResults(1)
                    .list().get(0);
        } catch (IndexOutOfBoundsException e) {
            throw new UserNotFoundException(e);
        }
    }

    @Override
    public List<UserDb> getAll(Session session, UserDb userLogged) {
        return session.createQuery("FROM UserDb", UserDb.class)
                .list();
    }
}

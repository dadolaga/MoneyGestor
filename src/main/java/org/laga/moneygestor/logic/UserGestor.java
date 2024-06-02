package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.exceptions.NotImplementedMethod;
import org.laga.moneygestor.logic.exceptions.*;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.User;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.data.domain.Example;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAmount;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class UserGestor implements Gestor<Integer, UserDb> {

    private SessionFactory sessionFactory;

    public UserGestor(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
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
            throw new UserCreationException("Not a valid mail password");

        var userDb = new UserDb();

        userDb.setFirstname(user.getFirstname().trim());
        userDb.setLastname(user.getLastname().trim());
        userDb.setUsername(user.getUsername().trim());
        userDb.setEmail(user.getEmail().trim());
        userDb.setPassword(PasswordUtilities.passwordEncrypt(user.getPassword()));

        return userDb;
    }

    public static void checkUser(UserDb userDb) {
        if(userDb == null)
            throw new IllegalArgumentException();
    }

    private static boolean isValidEmail(String email) {
        final String regexValidMail = "^(?![.])[A-Za-z0-9._%+-]+(?<![.])@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";

        Pattern pattern = Pattern.compile(regexValidMail);
        Matcher matcher = pattern.matcher(email);
        return matcher.matches();
    }

    public UserDb getFromAuthorizationToken(String authorizationToken) {
        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb WHERE token = :token", UserDb.class);
            query.setParameter("token", authorizationToken);

            var listOfUser = query.list();

            if(listOfUser.size() == 0)
                throw new EntityNotFoundException("user not found");

            if(listOfUser.size() > 1)
                throw new IllegalStateException("More user with token found");

            return listOfUser.get(0);
        }
    }

    public void checkValidityOfUser(UserDb userDb) {
        if(userDb == null || userDb.getToken() == null || userDb.getExpiratedToken() == null)
            throw new IllegalArgumentException();

        if(userDb.getExpiratedToken().isBefore(LocalDateTime.now()))
            throw new TokenExpiredException();
    }

    public UserDb getFromAuthorizationTokenAndCheckToken(String authorizationToken) {
        var user = getFromAuthorizationToken(authorizationToken);
        checkValidityOfUser(user);

        return user;
    }

    public UserDb login(String usernameOrMail, String password) {
        try (Session session = sessionFactory.openSession()) {
            var query = session.createQuery("FROM UserDb WHERE email LIKE :email OR username LIKE :username", UserDb.class);
            query.setParameter("email", usernameOrMail);
            query.setParameter("username", usernameOrMail);
            query.setMaxResults(1);

            try {
                var userLogged = query.list().get(0);

                if(!PasswordUtilities.checkPassword(password, userLogged.getPassword()))
                    throw new UserPasswordNotEqualsException();

                userLogged.setToken(TokenUtilities.generateNewToken());
                userLogged.setExpiratedToken(LocalDateTime.now().plus(TokenUtilities.TOKEN_DURATION));

                session.persist(userLogged);

                return userLogged;
            } catch (IndexOutOfBoundsException e) {
                throw new UserNotFoundException(e);
            }
        }
    }

    @Override
    public Integer insert(UserDb userLogged, UserDb object) {
        if(object == null)
            throw new IllegalArgumentException();
        
        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.persist(object);

            transaction.commit();

            return object.getId();
        } catch (HibernateException e) {
            if(e.getMessage().contains("unique_user_email"))
                throw new DuplicateValueException("Try to insert duplicate email");

            if(e.getMessage().contains("unique_user_username"))
                throw new DuplicateValueException("Try to insert duplicate username");

            throw e;
        }
    }

    @Override
    public void deleteById(UserDb userLogged, Integer id, boolean forceDelete) {
        if(!Objects.equals(userLogged.getId(), id))
            throw new UserNotHavePermissionException();

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.createMutationQuery("DELETE UserDb WHERE id = :id")
                    .setParameter("id", id)
                    .executeUpdate();

            transaction.commit();
        }
    }

    @Override
    public void update(UserDb userLogged, UserDb newObject) {
        update(userLogged, newObject.getId(), newObject);
    }

    @Override
    public void update(UserDb userLogged, Integer id, UserDb newUser) {
        if(newUser == null || id == null || userLogged == null)
            throw new IllegalArgumentException();

        if(!Objects.equals(userLogged.getId(), id))
            throw new UserNotHavePermissionException();

        try (Session session = sessionFactory.openSession())  {
            var user = getById(userLogged, id);

            user.setFirstname(newUser.getFirstname());
            user.setLastname(newUser.getLastname());
            user.setUsername(newUser.getUsername());
            user.setEmail(newUser.getEmail());

            Transaction transaction = session.beginTransaction();

            session.persist(user);

            transaction.commit();
        } catch (IndexOutOfBoundsException e) {
            throw new UserNotFoundException(e);
        }
    }

    @Override
    public UserDb getById(UserDb userLogged, Integer id) {
        try (Session session = sessionFactory.openSession()) {
            return session.createQuery("FROM UserDb WHERE id = :id", UserDb.class)
                    .setParameter("id", id)
                    .setMaxResults(1)
                    .list().get(0);
        } catch (IndexOutOfBoundsException e) {
            throw new UserNotFoundException(e);
        }
    }

    @Override
    public List<UserDb> getAll(UserDb userLogged) {
        try (Session session = sessionFactory.openSession()) {
            return session.createQuery("FROM UserDb", UserDb.class)
                    .list();
        }
    }
}

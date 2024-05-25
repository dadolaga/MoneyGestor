package org.laga.moneygestor.logic;

import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.jupiter.api.*;
import org.laga.moneygestor.App;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;

@Disabled
@SpringBootTest(classes = App.class)
public abstract class UserRequest extends LogicBaseTest {

    @Autowired
    UserRepository userRepository;

    private static final String username = "test-suit";
    private static final String password = "This_is_my_strong_password123";

    protected UserDb userLogged;

    private final List<Integer> idsUserCreate;

    public UserRequest() {
        idsUserCreate = new LinkedList<>();
    }

    @BeforeEach
    public void beforeEach() throws Exception {
        createUser(username, "first@test.ts");
        userLogged = login(username);
    }

    @AfterEach
    public void afterEach() throws Exception {
        deleteUser();
    }

    protected UserDb createUser(String username, String email) throws Exception {
        UserRegistrationForm userRegistrationForm = new UserRegistrationForm();

        userRegistrationForm.setFirstname("Test");
        userRegistrationForm.setLastname("Suit");
        userRegistrationForm.setEmail(email);
        userRegistrationForm.setUsername(username);
        userRegistrationForm.setPassword(password);
        userRegistrationForm.setConfirm(password);

        UserDb userDb = UserGestor.createUserFromRegistrationForm(userRegistrationForm);

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.persist(userDb);

            transaction.commit();
        }

        idsUserCreate.add(userDb.getId());

        return userDb;
    }

    protected UserDb login(String username) throws Exception {
        try (Session session = sessionFactory.openSession()) {
            var selectQuery = session.createQuery("FROM UserDb WHERE username = :username", UserDb.class);
            selectQuery.setParameter("username", username);

            var user = selectQuery.list().get(0);

            user.setToken(TokenUtilities.generateNewToken());
            user.setExpiratedToken(LocalDateTime.now().plusHours(2));

            Transaction transaction = session.beginTransaction();

            session.persist(user);

            transaction.commit();

            return user;
        }
    }

    protected void deleteUser() {
        userRepository.deleteAllById(idsUserCreate);
        userRepository.flush();
    }
}

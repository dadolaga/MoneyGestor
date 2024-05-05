package org.laga.logic;

import org.junit.Assert;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.jupiter.api.*;
import org.junit.runner.RunWith;
import org.laga.moneygestor.App;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.LinkedList;
import java.util.List;

@Disabled
@RunWith(SpringRunner.class)
@SpringBootTest(classes = App.class)
public abstract class UserRequest extends LogicBaseTest {
    @Autowired
    private UserRepository userRepository;

    private static final String username = "test-suit";
    private static final String password = "This_is_my_strong_password123";

    protected UserGestor userGestor;

    private final List<Integer> idsUserCreate;

    public UserRequest() {
        idsUserCreate = new LinkedList<>();
    }

    @BeforeEach
    public void beforeEach() throws Exception {
        createUser(username, "first@test.ts");
        userGestor = login(username);
    }

    @Test
    public void ignoreThisTest() { }

    @AfterEach
    public void afterEach() throws Exception {
        deleteUser();
    }

    protected UserGestor createUser(String username, String email) throws Exception {
        UserRegistrationForm userRegistrationForm = new UserRegistrationForm();

        userRegistrationForm.setFirstname("Test");
        userRegistrationForm.setLastname("Suit");
        userRegistrationForm.setEmail(email);
        userRegistrationForm.setUsername(username);
        userRegistrationForm.setPassword(password);
        userRegistrationForm.setConfirm(password);

        var userGestor = UserGestor.Builder.createFromForm(userRegistrationForm);

        var user = userRepository.saveAndFlush(userGestor.getDatabaseUser());

        idsUserCreate.add(user.getId());

        return userGestor;
    }

    protected UserGestor login(String username) throws Exception {
        var user = userRepository.findWithEmailOrUsername(username);

        var userGestor = UserGestor.Builder.createFromDB(user);

        userGestor.generateNewToken();

        userRepository.updateToken(userGestor.getId(), userGestor.getToken(), userGestor.getExpiryToken());

        userRepository.flush();

        return userGestor;
    }

    protected void deleteUser() {
        userRepository.deleteAllById(idsUserCreate);
        userRepository.flush();
    }
}

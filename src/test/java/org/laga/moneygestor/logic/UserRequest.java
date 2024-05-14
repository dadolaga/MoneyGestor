package org.laga.moneygestor.logic;

import org.junit.jupiter.api.*;
import org.laga.moneygestor.App;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.LinkedList;
import java.util.List;

@Disabled
@SpringBootTest(classes = App.class)
public abstract class UserRequest extends LogicBaseTest {
    @Autowired
    private UserRepository userRepository;

    private static final String username = "test-suit";
    private static final String password = "This_is_my_strong_password123";

    protected UserGestor userLogged;

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

package org.laga.moneygestor.services;

import jakarta.transaction.Transactional;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.json.Login;
import org.laga.moneygestor.services.json.User;
import org.laga.moneygestor.services.json.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.repository.query.Param;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
public class UserRest {
    private final UserRepository userRepository;

    @Autowired
    public UserRest(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/new")
    public void createNewUser(@RequestBody UserRegistrationForm user) {
        try {
            UserGestor userGestor = UserGestor.Builder.createFromForm(user);

            userRepository.save(userGestor.getDatabaseUser());
        } catch (UserCreationException e) {
            throw MoneyGestorErrorSample.NOT_ALL_FIELD_INSERT;
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("unique_user_email"))
                throw MoneyGestorErrorSample.USER_DUPLICATE_EMAIL;
            if(e.getMessage().contains("unique_user_username"))
                throw MoneyGestorErrorSample.USER_DUPLICATE_USERNAME;
        }
    }

    @PostMapping("/login")
    public User loginUser(@RequestBody Login login) {
        var user = userRepository.findWithEmailOrUsername(login.getUsername());
        if(user == null)
            throw MoneyGestorErrorSample.USER_EMAIL_USERNAME_NOT_EXIST;

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);
        if(!userGestor.checkPassword(login.getPassword()))
            throw MoneyGestorErrorSample.USER_PASSWORD_NOT_CORRECT;

        userGestor.generateNewToken();

        userRepository.updateToken(userGestor.getId(), userGestor.getToken(), userGestor.getExpiryToken());

        userRepository.flush();

        return userGestor.generateReturnUser();
    }

    @GetMapping("/token")
    public User getUserFromToken(@RequestParam(value = "token") String token) {
        var user = userRepository.findFromToken(token);
        if(user == null)
            throw MoneyGestorErrorSample.USER_NOT_FOUND;

        var userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

        return userGestor.generateReturnUser();
    }
}

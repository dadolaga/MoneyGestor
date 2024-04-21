package org.laga.moneygestor.services;

import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.Login;
import org.laga.moneygestor.services.models.User;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
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
            throw MoneyGestorErrorSample.mapOfError.get(1);
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("unique_user_email"))
                throw MoneyGestorErrorSample.mapOfError.get(101);
            if(e.getMessage().contains("unique_user_username"))
                throw MoneyGestorErrorSample.mapOfError.get(102);
        }
    }

    @PostMapping("/login")
    public User loginUser(@RequestBody Login login) {
        var user = userRepository.findWithEmailOrUsername(login.getUsername());
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(103);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);
        if(!userGestor.checkPassword(login.getPassword()))
            throw MoneyGestorErrorSample.mapOfError.get(104);

        userGestor.generateNewToken();

        userRepository.updateToken(userGestor.getId(), userGestor.getToken(), userGestor.getExpiryToken());

        userRepository.flush();

        return userGestor.generateReturnUser();
    }

    @GetMapping("/token")
    public User getUserFromToken(@RequestParam(value = "token") String token) {
        var user = userRepository.findFromToken(token);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        var userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        return userGestor.generateReturnUser();
    }
}

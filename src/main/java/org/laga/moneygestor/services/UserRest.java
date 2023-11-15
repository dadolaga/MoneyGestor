package org.laga.moneygestor.services;

import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.json.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserRest {
    private UserRepository userRepository;

    @Autowired
    public UserRest(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/new")
    public void createNewUser(@RequestBody User user) {
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
}

package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.logic.exceptions.UserPasswordNotEqualsException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.models.LoginForm;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.UserRegistrationForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserRest extends BaseRest {

    private final UserGestor userGestor;

    @Autowired
    public UserRest(EntityManagerFactory managerFactory) {
        super(managerFactory);
        userGestor = new UserGestor(sessionFactory);
    }

    @PostMapping("/registration")
    public Response registrationUser(@RequestBody UserRegistrationForm userRegistrationForm) {
        try {
            UserDb userCreated = UserGestor.createUserFromRegistrationForm(userRegistrationForm);

            userGestor.insert(null, userCreated);

            return Response.ok();
        } catch (UserPasswordNotEqualsException ex) {
            throw new HttpException(HttpStatus.BAD_REQUEST, 112, "Password is not equal");
        } catch (DuplicateValueException | UserCreationException ex) {
            throw new HttpException(HttpStatus.BAD_REQUEST, 112, ex.getMessage());
        }
    }

    @PostMapping("/login")
    public Response login(@RequestBody LoginForm loginForm) {
        try {
            var userDb = userGestor.login(loginForm.getUsername(), loginForm.getPassword());

            return Response.create(UserGestor.convertToRest(userDb));
        } catch (UserPasswordNotEqualsException ex) {
            throw new HttpException(HttpStatus.BAD_REQUEST, 111, "Password is not correct");
        }
    }
}

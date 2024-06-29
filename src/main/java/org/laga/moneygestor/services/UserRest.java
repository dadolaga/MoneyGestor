package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserCreationException;
import org.laga.moneygestor.logic.exceptions.UserNotFoundException;
import org.laga.moneygestor.logic.exceptions.UserPasswordNotEqualsException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.exceptions.IllegalArgumentHttpException;
import org.laga.moneygestor.services.models.LoginForm;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.SendId;
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

            var id = userGestor.insert(null, userCreated);

            var sendId = new SendId();

            sendId.setId(id.longValue());

            return Response.create(sendId);
        } catch (UserPasswordNotEqualsException ex) {
            throw new IllegalArgumentHttpException("Password is not equal");
        } catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException(ex.getMessage());
        } catch (UserCreationException ex) {
            throw new HttpException(HttpStatus.BAD_REQUEST, 111, ex.getMessage());
        }
    }

    @PostMapping("/login")
    public Response login(@RequestBody LoginForm loginForm) {
        try {
            var userDb = userGestor.login(loginForm.getUsername(), loginForm.getPassword());

            return Response.create(UserGestor.convertToRest(userDb));
        } catch (UserPasswordNotEqualsException | UserNotFoundException ex) {
            throw new HttpException(HttpStatus.BAD_REQUEST, 112, ex.getMessage());
        }
    }
}

package org.laga.moneygestor.services;

import org.hibernate.SessionFactory;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.TransactionTypeGestor;
import org.laga.moneygestor.services.models.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactionType")
public class TransactionTypeRest extends BaseRest {
    @Autowired
    public TransactionTypeRest(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    @GetMapping("/getAll")
    public Response getListTransactionType(@RequestHeader(name = HttpHeaders.AUTHORIZATION) String authorization) {
        UserDb loggedUser = getUserLogged(authorization);

        TransactionTypeGestor gestor = new TransactionTypeGestor(sessionFactory);

        return Response.create(TransactionTypeGestor.convertToRest(gestor.getAll(loggedUser)));
    }
/*
    @PostMapping("/new")
    public void addNewTransactionType(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionTypeForm transactionTypeForm) {
        UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, authorization);
        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionTypeDb transactionTypeDb = new TransactionTypeDb();
        transactionTypeDb.setName(transactionTypeForm.getName());
        transactionTypeDb.setUserId(userGestor.getId());

        TransactionTypeGestor transactionTypeGestor = new TransactionTypeGestor(sessionFactory);

        try {
            transactionTypeGestor.insert(userGestor, transactionTypeDb);
        } catch (DuplicateValueException e) {
                throw MoneyGestorErrorSample.mapOfError.get(5);
        }
    }*/
}

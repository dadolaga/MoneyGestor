package org.laga.moneygestor.services;

import org.hibernate.SessionFactory;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.TransactionTypeGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.TransactionTypeForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/new")
    public Response addNewTransactionType(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionTypeForm transactionTypeForm) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionTypeGestor gestor = new TransactionTypeGestor(sessionFactory);

        TransactionTypeDb transactionTypeDb = new TransactionTypeDb();
        transactionTypeDb.setName(transactionTypeForm.getName());
        transactionTypeDb.setUserId(userLogged.getId());

        try {
            var id = gestor.insert(userLogged, transactionTypeDb);

            return Response.sendId(id);
        } catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException("Wallet already exist", ex);
        }
    }
}

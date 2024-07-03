package org.laga.moneygestor.services;

import org.hibernate.SessionFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transaction_type")
public class TransactionTypeRest extends BaseRest {
    @Autowired
    public TransactionTypeRest(SessionFactory sessionFactory) {
        super(sessionFactory);
    }
/*
    @GetMapping("/list")
    public List<TransactionTypeDb> getListTransactionType(@RequestHeader(name = HttpHeaders.AUTHORIZATION) String authorization) {
        UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, authorization);
        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionTypeGestor transactionTypeGestor = new TransactionTypeGestor(sessionFactory);

        return transactionTypeGestor.getAll(userGestor);
    }

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

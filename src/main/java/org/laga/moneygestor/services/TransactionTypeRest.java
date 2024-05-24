package org.laga.moneygestor.services;

import org.hibernate.SessionFactory;
import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.repository.TransactionTypeRepository;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.TransactionTypeGestor;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.TransactionTypeForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transaction_type")
public class TransactionTypeRest extends BaseRest {
    private final UserRepository userRepository;

    @Autowired
    public TransactionTypeRest(UserRepository userRepository, SessionFactory sessionFactory) {
        super(sessionFactory);
        this.userRepository = userRepository;
    }

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
    }
}

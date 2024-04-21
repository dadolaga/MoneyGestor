package org.laga.moneygestor.services;

import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.repository.TransactionTypeRepository;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.TransactionTypeForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transaction_type")
public class TransactionTypeRest {
    private final TransactionTypeRepository transactionTypeRepository;
    private final UserRepository userRepository;

    @Autowired
    public TransactionTypeRest(TransactionTypeRepository transactionTypeRepository, UserRepository userRepository) {
        this.transactionTypeRepository = transactionTypeRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/list")
    public List<TransactionTypeDb> getListTransactionType(@RequestHeader(name = HttpHeaders.AUTHORIZATION) String authorization) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        return transactionTypeRepository.findWithUserOrNull(userGestor.getId());
    }

    @PostMapping("/new")
    public void addNewTransactionType(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionTypeForm transactionTypeForm) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionTypeDb transactionTypeDb = new TransactionTypeDb();
        transactionTypeDb.setName(transactionTypeForm.getName());
        transactionTypeDb.setUserId(userGestor.getId());

        try {
            transactionTypeRepository.save(transactionTypeDb);
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("unique_name_user"))
                throw MoneyGestorErrorSample.mapOfError.get(5);
        }
    }
}

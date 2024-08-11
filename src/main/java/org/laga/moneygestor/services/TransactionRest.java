package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.DateUtilities;
import org.laga.moneygestor.logic.TransactionGestor;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.TransactionForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@RestController
@RequestMapping("/api/transaction")
public class TransactionRest extends BaseRest {
    private static final String TAG = "TransactionRest";
    @Autowired
    public TransactionRest(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @PostMapping("/new")
    public Response addNewTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionForm transactionForm) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        var transaction = new TransactionDb();

        transaction.setDescription(transactionForm.getDescription());
        transaction.setDate(DateUtilities.convertToLocalDate(transactionForm.getDate()));
        transaction.setValue(transactionForm.getValue());
        transaction.setTypeId(transactionForm.getTypeId());
        transaction.setWalletId(transactionForm.getWallet());
        transaction.setUserOfTransactionId(userLogged.getId());

        try {
            Long idInserted;
            if(Objects.equals(transactionForm.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId())) {
                idInserted = transactionGestor.insertMoneyTransfer(userLogged, transaction, transactionForm.getWalletDestination());
            } else {
                idInserted = transactionGestor.insert(userLogged, transaction);
            }

            return Response.sendId(idInserted);
        } catch (NegativeWalletException ignored) {
            throw new HttpException(201, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/list")
    public Response getTransactionList(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                                     @RequestParam(name = "sort", required = false) String sortParams,
                                                     @RequestParam(name = "limit", required = false, defaultValue = "25") Integer limitParams,
                                                     @RequestParam(name = "page", required = false, defaultValue = "0") Integer pageParams) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        var listOfTransactions = transactionGestor.list(userLogged, sortParams, limitParams, pageParams);

        return Response.create(TransactionGestor.convertToRest(listOfTransactions));
    }

    @GetMapping("/get/{id}")
    public Response getAllTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        return Response.create(TransactionGestor.convertToRest(transactionGestor.getById(userLogged, id)));
    }

    @PostMapping("/edit/{id}")
    public Response editTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionForm transactionForm, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        var transaction = transactionGestor.getById(userLogged, id);

        transaction.setDescription(transactionForm.getDescription());
        transaction.setDate(DateUtilities.convertToLocalDate(transactionForm.getDate()));
        transaction.setValue(transactionForm.getValue());
        transaction.setTypeId(transactionForm.getTypeId());
        transaction.setWalletId(transactionForm.getWallet());
        if(transaction.getTypeId().equals(DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId()))
            transaction.getTransactionDestination().setWalletId(transactionForm.getWalletDestination());

        try {
            transactionGestor.update(userLogged, id, transaction);

            return Response.ok();
        } catch (NegativeWalletException ignored) {
            throw new HttpException(201, HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/delete/{id}")
    public Response deleteTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        transactionGestor.deleteById(userLogged, id);

        return Response.ok();
    }

    @GetMapping("/graph")
    public Response getGraph(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                             @RequestParam(name = "start") String startDate,
                             @RequestParam(name = "end") String endDate) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        var graph = transactionGestor.graph(userLogged, DateUtilities.convertToLocalDate(startDate), DateUtilities.convertToLocalDate(endDate));

        return Response.create(TransactionGestor.convertGraphToDataGraph(graph));
    }
}

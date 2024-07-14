package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.DateUtilities;
import org.laga.moneygestor.logic.TransactionGestor;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.TransactionForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
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

        Long idInserted;
        if(Objects.equals(transactionForm.getTypeId(), DatabaseInitializer.TRANSACTION_TYPE_SWITCH.getId())) {
            idInserted = transactionGestor.insertMoneyTransfer(userLogged, transaction, transactionForm.getWalletDestination());
        } else {
            idInserted = transactionGestor.insert(userLogged, transaction);
        }

        return Response.sendId(idInserted);
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
        transaction.getTransactionDestination().setWalletId(transactionForm.getWalletDestination());

        transactionGestor.update(userLogged, id, transaction);

        return Response.ok();
    }

    @PostMapping("/delete/{id}")
    public Response deleteTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        TransactionGestor transactionGestor = new TransactionGestor(sessionFactory);

        transactionGestor.deleteById(userLogged, id);

        return Response.ok();
    }

    /*@GetMapping("/graph")
    public List<LineGraph<LocalDate, BigDecimal>> getGraph(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        List<LineGraph<LocalDate, BigDecimal>> graph = new LinkedList<>();

        List<WalletDb> walletDbs = walletRepository.getWalletsFromUser(userGestor.getId());

        for(var wallet : walletDbs) {
            Query query = entityManager.createNativeQuery("SELECT Value - (SELECT SUM(Value) FROM transaction WHERE Wallet = :id AND Date BETWEEN :dateStart AND :dateEnd) AS Value FROM wallet WHERE Id = :id");
            query.setParameter("id", wallet.getId()).setParameter("dateStart", LocalDate.of(1970,Month.JANUARY,1)).setParameter("dateEnd", LocalDate.now());
            BigDecimal walletValue = (BigDecimal) query.getResultList().get(0);

            LineGraph<LocalDate, BigDecimal> lineGraph = new LineGraph<>();
            lineGraph.setId(wallet.getName());
            lineGraph.setColor(wallet.getColor());
            lineGraph.setData(new LinkedList<>());

            TransactionGraphView transactionExample = new TransactionGraphView();
            transactionExample.setWallet(wallet.getId());

            List<TransactionGraphView> transactions = transactionGraphRepository.findAll(Example.of(transactionExample));

            for(var transaction : transactions) {
                walletValue = walletValue.add(transaction.getValue());

                var graphElement = new LineGraph.DataElement<LocalDate, BigDecimal>();
                graphElement.setX(transaction.getDate());
                graphElement.setY(walletValue);

                lineGraph.getData().add(graphElement);
            }

            graph.add(lineGraph);
        }

        return graph;
    }*/
}

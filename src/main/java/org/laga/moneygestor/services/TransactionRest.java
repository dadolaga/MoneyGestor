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

    /*@GetMapping("/list")
    public List<TransactionTableView> getTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestParam(name = "sort", required = false) String sortParams) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionTableView transactionExample = new TransactionTableView();
        transactionExample.setUser(userGestor.getId());

        Sort sort = SortGestor.decode(sortParams);

        return transactionTableRepository.findAll(Example.of(transactionExample), sort);
    }

    @GetMapping("/get/{id}")
    public Transaction getAllTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable Long id) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionDb transactionExample = new TransactionDb();
        transactionExample.setUserId(userGestor.getId());
        transactionExample.setId(id);

        try {
            return TransactionGestor.convertToRest(transactionRepository.findOne(Example.of(transactionExample)).get());
        } catch (NoSuchElementException ignored) {
            throw MoneyGestorErrorSample.mapOfError.get(4);
        }
    }

    @PostMapping("/edit/{id}")
    public void editTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody TransactionForm transaction, @PathVariable Long id) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSX");

            TransactionDb transactionSource = transactionRepository.findById(id).get();

            transactionSource.setDescription(transaction.getDescription());
            transactionSource.setDate(LocalDate.parse(transaction.getDate(), formatter));
            transactionSource.setValue(transaction.getTypeId() == ID_EXCHANGE_TYPE? transaction.getValue().negate() : transaction.getValue());
            transactionSource.setTypeId(transaction.getTypeId());
            transactionSource.setWalletId(transaction.getWallet());

            transactionRepository.save(transactionSource);

            if(transaction.getTypeId() != ID_EXCHANGE_TYPE)
                return;

            TransactionDb transactionDestination = transactionRepository.findById(transactionSource.getTransactionDestinationId()).get();

            transactionDestination.setDescription(transaction.getDescription());
            transactionDestination.setDate(LocalDate.parse(transaction.getDate(), formatter));
            transactionDestination.setValue(transaction.getValue());
            transactionDestination.setTypeId(transaction.getTypeId());
            transactionDestination.setWalletId(transaction.getWalletDestination());

            transactionRepository.save(transactionDestination);

            transactionRepository.flush();

        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        } catch (NoSuchElementException ignored) {
            throw MoneyGestorErrorSample.mapOfError.get(0);
        }
    }

    @GetMapping("/delete/{id}")
    public void deleteTransaction(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable Long id) {
        var user = userRepository.findFromToken(authorization);
        if(user == null)
            throw MoneyGestorErrorSample.mapOfError.get(2);

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        TransactionDb transactionExample = new TransactionDb();
        transactionExample.setUserId(userGestor.getId());
        transactionExample.setId(id);

        transactionRepository.delete(transactionExample);
    }

    @GetMapping("/graph")
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

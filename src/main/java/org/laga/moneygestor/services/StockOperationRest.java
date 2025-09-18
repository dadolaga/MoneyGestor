package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.StockOperationDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.DateUtilities;
import org.laga.moneygestor.logic.StockGestor;
import org.laga.moneygestor.logic.StockOperationGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.logic.exceptions.NotNewerMovementException;
import org.laga.moneygestor.logic.exceptions.SameDateMovementException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.StockOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;

@RestController
@RequestMapping("/api/stock_operation")
public class StockOperationRest extends BaseRest {

    @Autowired
    public StockOperationRest(EntityManagerFactory managerFactory) {
        super(managerFactory);
    }

    @PostMapping("/new")
    public Response addNew(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization, @RequestBody StockOperationInsert stockOperation) {
        UserDb loggedUser = getUserLogged(authorization);

        StockOperationGestor gestor = new StockOperationGestor(sessionFactory);

        var stockOperationDb = new StockOperationDb();

        stockOperationDb.setDescription(stockOperation.getDescription());
        stockOperationDb.setDate(DateUtilities.convertToLocalDate(stockOperation.getDate()));
        stockOperationDb.setValue(stockOperation.getValue());
        stockOperationDb.setStockId(stockOperation.getStock().getId());
        stockOperationDb.setTfr(stockOperation.isTfr());

        try {
            var id = gestor.insert(loggedUser, stockOperationDb, stockOperation.getWallet());

            return Response.sendId(id);
        } catch (SameDateMovementException ex) {
            throw new HttpException(301, HttpStatus.BAD_REQUEST);
        } catch (NotNewerMovementException ex) {
            throw new HttpException(302, HttpStatus.BAD_REQUEST);
        }  catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException("Stock already exist", ex);
        }
    }
    @GetMapping("/list")
    public Response getList(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                            @RequestParam(name = "stock", required = false) Integer stockId,
                            @RequestParam(name = "order", required = false) String sortParams,
                            @RequestParam(name = "limit", required = false, defaultValue = "25") Integer limitParams,
                            @RequestParam(name = "page", required = false, defaultValue = "0") Integer pageParams) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockOperationGestor(sessionFactory);
        var stockGestor = new StockGestor(sessionFactory);

        var listOfStock = gestor.list(userLogged, stockId, "date", limitParams, pageParams);

          var currentValue = stockGestor.getStockValueAtDate(userLogged, stockId, listOfStock.stream().findFirst().get().getDate());
        var lambdaCurrentValue = new LambdaOperation<BigDecimal>(currentValue);

        return Response.create(listOfStock.stream().sorted(Comparator.comparing(StockOperationDb::getDate)).map(s -> {
            var stock = StockOperationGestor.convertToRest(s);

            if(stock.getBankDeposit() == null && !stock.isTfr())
                stock.setCurrentYield(lambdaCurrentValue.getValue().add(stock.getValue()).divide(lambdaCurrentValue.getValue(), 5, RoundingMode.HALF_UP).subtract(BigDecimal.ONE));

            lambdaCurrentValue.setValue(lambdaCurrentValue.getValue().add(stock.getValue()));

            return stock;
        }).toList().stream().sorted((a, b) -> ((StockOperation) a).getDate().compareTo(((StockOperation) b).getDate()) * -1));
    }

    @GetMapping("/get/{id}")
    public Response getStock(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockOperationGestor(sessionFactory);

        return Response.create(StockOperationGestor.convertToRest(gestor.getById(userLogged, id)));
    }

    @PostMapping("/edit/{id}")
    public Response editStockOperation(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody StockOperationInsert transactionForm, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockOperationGestor(sessionFactory);

        var stockOperation = gestor.getById(userLogged, id);

        stockOperation.setDate(DateUtilities.convertToLocalDate(transactionForm.getDate()));
        stockOperation.setDescription(transactionForm.getDescription());
        stockOperation.setValue(transactionForm.getValue());
        stockOperation.setTfr(transactionForm.isTfr());
        stockOperation.setBankTransactionId(transactionForm.getWallet() == null? null : stockOperation.getBankTransactionId());

        try {
            gestor.update(userLogged, id, stockOperation, transactionForm.getWallet());

            return Response.ok();
        } catch (NegativeWalletException ignored) {
            throw new HttpException(201, HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/delete/{id}")
    public Response deleteStockOperation(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockOperationGestor(sessionFactory);

        try {
            gestor.deleteById(userLogged, id);
        } catch (NotNewerMovementException ex) {
            throw new HttpException(302, HttpStatus.BAD_REQUEST);
        }

        return Response.ok();
    }

    private static class StockOperationInsert extends StockOperation {
        private Integer wallet;

        public Integer getWallet() {
            return wallet;
        }

        public void setWallet(Integer wallet) {
            this.wallet = wallet;
        }
    }

    private static class LambdaOperation<T> {
        private T value;

        public LambdaOperation(T value) {
            this.value = value;
        }

        public T getValue() {
            return value;
        }

        public void setValue(T value) {
            this.value = value;
        }
    }
}

package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.StockOperationDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.StockOperationGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.NegativeWalletException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.exceptions.HttpException;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.StockOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

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
        stockOperationDb.setDate(stockOperation.getDate());
        stockOperationDb.setValue(stockOperation.getValue());
        stockOperationDb.setStockId(stockOperation.getStock().getId());
        stockOperationDb.setTfr(stockOperation.isTfr());

        try {
            var id = gestor.insert(loggedUser, stockOperationDb, stockOperation.getWallet());

            return Response.sendId(id);
        } catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException("Stock already exist", ex);
        }
    }
    @GetMapping("/list")
    public Response getList(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                            @RequestParam(name = "sort", required = false) String sortParams,
                            @RequestParam(name = "limit", required = false, defaultValue = "25") Integer limitParams,
                            @RequestParam(name = "page", required = false, defaultValue = "0") Integer pageParams) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockOperationGestor(sessionFactory);

        var listOfStock = gestor.list(userLogged, sortParams + (Objects.requireNonNullElse(sortParams, "").length() > 0? "-" : "") + "!id", limitParams, pageParams);

        return Response.create(StockOperationGestor.convertToRest(listOfStock));
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

    private static class StockOperationInsert extends StockOperation {
        private Integer wallet;

        public Integer getWallet() {
            return wallet;
        }

        public void setWallet(Integer wallet) {
            this.wallet = wallet;
        }
    }
}

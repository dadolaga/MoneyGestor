package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.StockDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.StockGestor;
import org.laga.moneygestor.logic.TransactionGestor;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.models.CreateWallet;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.Stock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@RestController
@RequestMapping("/api/stock")
public class StockRest extends BaseRest {
    @Autowired
    public StockRest(EntityManagerFactory sessionFactory) {
        super(sessionFactory);
    }

    @PostMapping("/new")
    public Response addNew(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization, @RequestBody Stock stock) {
        UserDb loggedUser = getUserLogged(authorization);

        StockGestor gestor = new StockGestor(sessionFactory);

        StockDb stockDb = new StockDb();

        stockDb.setName(stock.getName());
        stockDb.setSubscriptionDate(stock.getSubscriptionDate());
        stockDb.setSubscriptionValue(stock.getSubscriptionValue());

        try {
            var id = gestor.insert(loggedUser, stockDb);

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

        StockGestor gestor = new StockGestor(sessionFactory);

        var listOfStock = gestor.list(userLogged, sortParams + (Objects.requireNonNullElse(sortParams, "").length() > 0? "-" : "") + "!id", limitParams, pageParams);

        return Response.create(StockGestor.convertToRest(listOfStock));
    }

    @GetMapping("/get/{id}")
    public Response getStock(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Integer id) {
        UserDb userLogged = getUserLogged(authorization);

        var gestor = new StockGestor(sessionFactory);

        return Response.create(StockGestor.convertToRest(gestor.getById(userLogged, id)));
    }

}

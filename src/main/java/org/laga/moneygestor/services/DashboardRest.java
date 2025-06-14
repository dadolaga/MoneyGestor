package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.DatabaseInitializer;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.logic.DateUtilities;
import org.laga.moneygestor.logic.TransactionGestor;
import org.laga.moneygestor.logic.TransactionTypeGestor;
import org.laga.moneygestor.services.models.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedList;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardRest extends BaseRest {
    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);

    @Autowired
    public DashboardRest(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @GetMapping("/transaction")
    public Response getTransaction(@RequestHeader(name = HttpHeaders.AUTHORIZATION) String authorization,
                                           @RequestParam(name = "start", required = false) String start,
                                           @RequestParam(name = "end", required = false) String end,
                                           @RequestParam(name = "moneyIn", required = false) boolean isMoneyIn) {
        UserDb loggedUser = getUserLogged(authorization);

        var gestor = new TransactionGestor(sessionFactory);

        var transactions = gestor.getTransactionByFilter(loggedUser,
                DateUtilities.convertToLocalDate(start),
                DateUtilities.convertToLocalDate(end),
                false,
                false,
                null,
                null);

        return Response.create(TransactionGestor.convertToRest(transactions));
    }

    @GetMapping("/test")
    public void test(@RequestHeader(name = HttpHeaders.AUTHORIZATION) String authorization) {
        var gestor = new TransactionGestor(sessionFactory);

        UserDb loggedUser = getUserLogged(authorization);

        var number = gestor.getNumberTransaction(loggedUser, null, null, true, false, new LinkedList<>(), new LinkedList<>());

        logger.info("" + number);
    }
}

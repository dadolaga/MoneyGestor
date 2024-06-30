package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.services.exceptions.DuplicateEntitiesHttpException;
import org.laga.moneygestor.services.models.CreateWallet;
import org.laga.moneygestor.services.models.Response;
import org.laga.moneygestor.services.models.Wallet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
public class WalletRest extends BaseRest {
    @Autowired
    public WalletRest(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @PostMapping("/new")
    public Response addNewWallet(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization, @RequestBody CreateWallet wallet) {
        UserDb loggedUser = getUserLogged(authorization);

        WalletGestor walletGestor = new WalletGestor(sessionFactory);

        var walletDb = new WalletDb();

        walletDb.setName(wallet.getName());
        walletDb.setValue(wallet.getValue());
        walletDb.setColor(wallet.getColor());
        walletDb.setUserId(loggedUser.getId());
        walletDb.setFavorite(false);

        try {
            var id = walletGestor.insert(loggedUser, walletDb);

            return Response.sendId(id);
        } catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException("Wallet already exist", ex);
        }
    }

    @GetMapping("/getAll")
    public List<Wallet> getWallets(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        UserDb loggedUser = getUserLogged(authorization);

        WalletGestor walletGestor = new WalletGestor(sessionFactory);

        return WalletGestor.convertToRest(walletGestor.getAll(loggedUser));
    }

    @GetMapping(value = "/list")
    public Response getWallets(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                   @RequestParam(name = "sort", required = false) String sortParams,
                                   @RequestParam(name = "limit", required = false, defaultValue = "25") Integer limitParams,
                                   @RequestParam(name = "page", required = false, defaultValue = "0") Integer pageParams) {
        UserDb loggedUser = getUserLogged(authorization);

        WalletGestor walletGestor = new WalletGestor(sessionFactory);

        return Response.create(
                WalletGestor.convertToRest(walletGestor.list(loggedUser, sortParams, limitParams, pageParams)));
    }


    @GetMapping("/get/{id}")
    public Response getWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Integer id) {
        UserDb userLogged = getUserLogged(authorization);
        WalletGestor walletGestor = new WalletGestor(sessionFactory);

        var wallet = WalletGestor.convertToRest(walletGestor.getById(userLogged, id));

        return Response.create(wallet);
    }


    @PostMapping("/edit/{id}")
    public Response editWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody Wallet wallet, @PathVariable(name = "id") Integer id) {
        UserDb userLogged = getUserLogged(authorization);
        WalletGestor walletGestor = new WalletGestor(sessionFactory);

        var newWallet = new WalletDb();

        newWallet.setName(wallet.getName());
        newWallet.setColor(wallet.getColor());

        try {
            walletGestor.update(userLogged, id, newWallet);

            return Response.ok();
        } catch (DuplicateValueException ex) {
            throw new DuplicateEntitiesHttpException("Wallet already exist", ex);
        }
    }
/*
    @GetMapping("/delete/{id}")
    public void deleteWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            walletGestor.deleteById(userGestor, id.intValue());
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        }
    }

    @PostMapping("/favorite/{id}")
    public void favoriteWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            WalletDb wallet = walletGestor.getById(userGestor, id.intValue());

            if(wallet == null)
                throw MoneyGestorErrorSample.mapOfError.get(6);

            wallet.setFavorite(!wallet.getFavorite());

            walletGestor.update(userGestor, wallet);
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        }
    }*/
}

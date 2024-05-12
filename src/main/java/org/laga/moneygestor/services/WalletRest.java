package org.laga.moneygestor.services;

import jakarta.persistence.EntityManagerFactory;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.SortGestor;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.models.CreateWallet;
import org.laga.moneygestor.services.models.Wallet;
import org.springframework.beans.PropertyAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
public class WalletRest extends BaseRest {
    final static Logger logger = LogManager.getLogger(WalletRest.class);
    private UserRepository userRepository;

    private WalletGestor walletGestor;

    @Autowired
    public WalletRest(EntityManagerFactory entityManagerFactory, UserRepository userRepository) {
        super(entityManagerFactory);
        this.userRepository = userRepository;
        walletGestor = new WalletGestor(sessionFactory);
    }

    @PostMapping("/new")
    public void addNewWallet(@RequestBody CreateWallet wallet) {
        UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, wallet.getToken());
        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.mapOfError.get(2);

        var walletDb = new WalletDb();

        walletDb.setName(wallet.getName());
        walletDb.setValue(wallet.getValue());
        walletDb.setUserId(userGestor.getId());
        walletDb.setFavorite(false);
        walletDb.setColor(wallet.getColor());

        walletGestor.insert(userGestor, walletDb);
    }

    @GetMapping("/list")
    public List<Wallet> getWallets(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestParam(name = "sort", required = false) String sortParams) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, authorization);
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            Sort sort = SortGestor.decode(sortParams);

            return WalletGestor.convertToRest(walletGestor.getAll(userGestor).toList());
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        } catch (PropertyAccessException e) {
            logger.error(e);

            throw MoneyGestorErrorSample.mapOfError.get(10);
        }
    }

    @GetMapping("/get/{id}")
    public Wallet getWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable(name = "id") Long id) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, authorization);
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            return WalletGestor.convertToRest(walletGestor.getById(userGestor, id.intValue()));
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        }
    }

    @PostMapping("/edit")
    public void editWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody Wallet wallet) {
        if(authorization == null)
            throw MoneyGestorErrorSample.mapOfError.get(3);

        try {
            UserGestor userGestor = UserGestor.Builder.loadFromAuthorization(userRepository, authorization);
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.mapOfError.get(2);

            walletGestor.update(userGestor, WalletGestor.convertToDb(wallet));
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.mapOfError.get(2);
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw MoneyGestorErrorSample.mapOfError.get(201);
        }
    }

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
    }
}

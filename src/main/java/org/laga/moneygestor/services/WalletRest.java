package org.laga.moneygestor.services;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.SortGestor;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.json.CreateWallet;
import org.laga.moneygestor.services.json.Wallet;
import org.springframework.beans.PropertyAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wallet")
public class WalletRest {
    final static Logger logger = LogManager.getLogger(WalletRest.class);

    private UserRepository userRepository;
    private WalletRepository walletRepository;

    @Autowired
    public WalletRest(UserRepository userRepository, WalletRepository walletRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
    }

    @PostMapping("/new")
    public void addNewWallet(@RequestBody CreateWallet wallet) {
        System.out.println(wallet);
        var user = userRepository.findFromToken(wallet.getToken());
        if(user == null)
            throw MoneyGestorErrorSample.USER_NOT_FOUND;

        UserGestor userGestor = UserGestor.Builder.createFromDB(user);

        if(!userGestor.tokenIsValid())
            throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

        var walletDb = new WalletDb();
        walletDb.setName(wallet.getName());
        walletDb.setValue(wallet.getValue());
        walletDb.setUserId(userGestor.getId());
        walletDb.setFavorite(false);

        try {
            walletRepository.saveAndFlush(walletDb);
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("index_wallet_name&user"))
                throw MoneyGestorErrorSample.WALLET_WITH_SAME_NAME;
        }
    }

    @GetMapping("/list")
    public List<Wallet> getWallets(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestParam(name = "sort", required = false) String sortParams) {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            WalletDb walletExample = new WalletDb();
            walletExample.setUserId(userGestor.getId());

            Sort sort = SortGestor.decode(sortParams);

            return WalletGestor.convertToRest(walletRepository.findAll(Example.of(walletExample), sort));
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
        } catch (PropertyAccessException e) {
            logger.error(e);

            throw MoneyGestorErrorSample.DATABASE_ERROR;
        }
    }

    @GetMapping("/get/{id}")
    public Wallet getWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable Long id) throws InterruptedException {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            return WalletGestor.convertToRest(walletRepository.getWalletsFromId(id.intValue(), userGestor.getId()));
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
        }
    }

    @PostMapping("/edit")
    public void editWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestBody Wallet wallet) {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            walletRepository.editWallet(wallet.getId(), wallet.getName(), wallet.getValue());
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("index_wallet_name&user"))
                throw MoneyGestorErrorSample.WALLET_WITH_SAME_NAME;
        }
    }

    @GetMapping("/delete/{id}")
    public void deleteWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable Long id) throws InterruptedException {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            if(walletRepository.deleteWalletUserAuthorized(id.intValue(), userGestor.getId()) == 0)
                throw MoneyGestorErrorSample.USER_NOT_HAVE_PERMISSION;

        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
        }
    }

    @PostMapping("/favorite/{id}")
    public void favoriteWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @PathVariable Long id) throws InterruptedException {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            if(walletRepository.changeFavorite(id.intValue(), userGestor.getId()) == 0)
                throw MoneyGestorErrorSample.USER_NOT_HAVE_PERMISSION;

        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
        }
    }
}

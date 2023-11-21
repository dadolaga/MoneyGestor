package org.laga.moneygestor.services;

import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.json.CreateWallet;
import org.laga.moneygestor.services.json.Wallet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wallet")
public class WalletRest {

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
        walletDb.setUser(userGestor.getId());

        try {
            walletRepository.saveAndFlush(walletDb);
        } catch (DataIntegrityViolationException e) {
            if(e.getMessage().contains("index_wallet_name&user"))
                throw MoneyGestorErrorSample.WALLET_WITH_SAME_NAME;
        }
    }

    @GetMapping("/list")
    public List<Wallet> getWallets(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        if(authorization == null)
            throw MoneyGestorErrorSample.LOGIN_REQUIRED;

        try {
            UserGestor userGestor = UserGestor.Builder.createFromDB(userRepository.findFromToken(authorization));
            if(!userGestor.tokenIsValid())
                throw MoneyGestorErrorSample.USER_TOKEN_NOT_VALID;

            return WalletGestor.convertToRest(walletRepository.getWalletsFromUser(userGestor.getId()));
        } catch (IllegalArgumentException e) {
            throw MoneyGestorErrorSample.USER_NOT_FOUND;
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
}

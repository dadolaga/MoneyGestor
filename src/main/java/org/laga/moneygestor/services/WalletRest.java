package org.laga.moneygestor.services;

import org.laga.moneygestor.db.repository.UserRepository;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.UserGestor;
import org.laga.moneygestor.services.exceptions.MoneyGestorErrorSample;
import org.laga.moneygestor.services.json.CreateWallet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;

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

        var walletDb = new org.laga.moneygestor.db.entity.Wallet();
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
}

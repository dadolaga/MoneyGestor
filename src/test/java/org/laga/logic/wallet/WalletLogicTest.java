package org.laga.logic.wallet;

import org.junit.Assert;
import org.junit.Ignore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.runner.RunWith;
import org.laga.logic.UserRequest;
import org.laga.moneygestor.App;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Example;
import org.springframework.test.context.junit4.SpringRunner;

import java.math.BigDecimal;
import java.util.stream.Stream;

@Disabled
@Ignore
@RunWith(SpringRunner.class)
@SpringBootTest(classes = App.class)
public abstract class WalletLogicTest extends UserRequest {
    @Autowired
    protected WalletRepository walletRepository;

    protected WalletDb walletDb;
    @BeforeEach
    public void createWallet() {
        walletDb = new WalletDb();

        walletDb.setName("Wallet test suit");
        walletDb.setValue(new BigDecimal(100));
        walletDb.setColor("ffffff");
        walletDb.setFavorite(false);
        walletDb.setUserId(userGestor.getId());
    }

    @AfterEach
    public void deleteWallet() {
        WalletDb walletExample = new WalletDb();

        walletExample.setName(walletDb.getName());
        walletExample.setUserId(walletDb.getUserId());

        Stream<Integer> idToDelete = walletRepository.findAll(Example.of(walletExample)).stream().map(wallet -> wallet.getId());

        walletRepository.deleteAllById(idToDelete.toList());
    }
}

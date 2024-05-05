package org.laga.logic.wallet;

import org.junit.Assert;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;

public class WalletInsertTest extends WalletLogicTest {
    @Test
    public void insertWallet_repositoryIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.insertWallet(null, walletDb);
        });
    }

    @Test
    public void insertWallet_walletIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.insertWallet(walletRepository, null);
        });
    }

    @Test
    public void insertWallet_noError() {
        WalletGestor.insertWallet(walletRepository, walletDb);
    }

    @Test
    public void insertWallet_effectiveInsert() {
        WalletGestor.insertWallet(walletRepository, walletDb);

        Assert.assertEquals(walletDb.getName(), walletRepository.findById(walletDb.getId()).get().getName());
    }

    @Test
    public void insertWallet_returnNewWalletWithId_return() {
        Assert.fail("Not implemented");
    }

    @Test
    public void insertWallet_duplicateName_throw() {
        WalletGestor.insertWallet(walletRepository, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName());
        wallet2.setColor(walletDb.getColor());
        wallet2.setUserId(userGestor.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(walletDb.getValue());

        Assert.assertThrows(DuplicateValueException.class, () -> {
            WalletGestor.insertWallet(walletRepository, wallet2);
        });
    }

}

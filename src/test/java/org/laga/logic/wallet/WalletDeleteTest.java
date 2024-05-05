package org.laga.logic.wallet;

import org.junit.Assert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

public class WalletDeleteTest extends WalletLogicTest {
    @BeforeEach
    public void insertWallet() {
        WalletGestor.insertWallet(walletRepository, walletDb);
    }

    @Test
    public void deleteWallet_repositoryIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.deleteWallet(null, userGestor, walletDb);
        });
    }

    @Test
    public void deleteWallet_userIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.deleteWallet(walletRepository, null, walletDb);
        });
    }

    @Test
    public void deleteWallet_walletIsNull_throw() {
        WalletDb wallet = null;

        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.deleteWallet(walletRepository, userGestor, wallet);
        });
    }

    @Test
    public void deleteWallet_idIsNull_throw() {
        Integer walletId = null;

        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.deleteWallet(walletRepository, userGestor, walletId);
        });
    }

    @Test
    public void deleteWallet_deleteCorrect() {
        WalletGestor.deleteWallet(walletRepository, userGestor, walletDb.getId());
    }

    @Test
    public void deleteWallet_deleteCorrect_effectiveDelete() {
        WalletGestor.deleteWallet(walletRepository, userGestor, walletDb.getId());

        Assert.assertTrue(walletRepository.findById(walletDb.getId()).isEmpty());
    }

    @Test
    public void deleteWallet_userNotHavePermission_throw() throws Exception {
        createUser("second-user-test", "second@test.ts");
        var secondUser = login("second-user-test");

        Assert.assertThrows(UserNotHavePermissionException.class, () -> {
            WalletGestor.deleteWallet(walletRepository, secondUser, walletDb.getId());
        });
    }
}

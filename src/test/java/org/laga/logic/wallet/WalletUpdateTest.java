package org.laga.logic.wallet;

import org.junit.Assert;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.WalletGestor;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.math.BigDecimal;

public class WalletUpdateTest extends WalletLogicTest {
    @Test
    public void updateWallet_repositoryIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.updateWallet(null, userGestor, walletDb.getId(), walletDb);
        });
    }

    @Test
    public void updateWallet_userIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.updateWallet(walletRepository, null, walletDb.getId(), walletDb);
        });
    }

    @Test
    public void updateWallet_idIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.updateWallet(walletRepository, userGestor, null, walletDb);
        });
    }

    @Test
    public void updateWallet_walletIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.updateWallet(walletRepository, userGestor, walletDb.getId(), null);
        });
    }

    @Test
    public void updateWallet_idIsNotTheSame_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            WalletGestor.updateWallet(walletRepository, userGestor, walletDb.getId() + 1, walletDb);
        });
    }

    @Test
    public void updateWallet_walletUpdate_NoError() {
        WalletGestor.insertWallet(walletRepository, walletDb);

        walletDb.setName(walletDb.getName() + "_CHANGED");

        WalletGestor.updateWallet(walletRepository, userGestor, walletDb.getId(), walletDb);
    }

    @Test
    public void updateWallet_noIdInWallet_NoError() {
        WalletGestor.insertWallet(walletRepository, walletDb);

        int id = walletDb.getId();

        walletDb.setId(null);
        walletDb.setName(walletDb.getName() + "_CHANGED");

        WalletGestor.updateWallet(walletRepository, userGestor, id, walletDb);
    }

    @Test
    public void updateWallet_walletUpdate_effectiveUpdate() {
        final String newText = "This is new test text";
        WalletGestor.insertWallet(walletRepository, walletDb);

        walletDb.setName(newText);

        WalletGestor.updateWallet(walletRepository, userGestor, walletDb.getId(), walletDb);

        var walletEdit = walletRepository.findById(walletDb.getId()).get();

        Assert.assertEquals(newText, walletEdit.getName());
    }

    @Test
    public void updateWallet_changeWithSameName_throw() {
        WalletGestor.insertWallet(walletRepository, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName());
        wallet2.setColor("ff0000");
        wallet2.setUserId(userGestor.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(new BigDecimal(302));

        Assert.assertThrows(DuplicateValueException.class, () -> {
            WalletGestor.updateWallet(walletRepository, userGestor, walletDb.getId(), wallet2);
        });
    }

    @Test
    public void updateWallet_userNotHavePermission_throw() throws Exception {
        WalletGestor.insertWallet(walletRepository, walletDb);

        var wallet2 = new WalletDb();

        walletDb.setName(walletDb.getName() + "_CHANGED");

        createUser("second-user-test", "second@test.ts");
        var secondUser = login("second-user-test");

        Assert.assertThrows(UserNotHavePermissionException.class, () -> {
            WalletGestor.updateWallet(walletRepository, secondUser, walletDb.getId(), wallet2);
        });
    }
}

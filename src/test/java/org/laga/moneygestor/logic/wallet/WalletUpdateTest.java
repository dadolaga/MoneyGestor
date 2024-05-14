package org.laga.moneygestor.logic.wallet;

import org.hibernate.Session;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

import java.math.BigDecimal;

public class WalletUpdateTest extends WalletLogicTest {
    @Test
    public void updateWallet_userIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.update(null, walletDb.getId(), walletDb);
        });
    }

    @Test
    public void updateWallet_idIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.update(userLogged, null, walletDb);
        });
    }

    @Test
    public void updateWallet_walletIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.update(userLogged, walletDb.getId(), null);
        });
    }

    @Test
    public void updateWallet_idIsNotTheSame_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.update(userLogged, walletDb.getId() + 1, walletDb);
        });
    }

    @Test
    public void updateWallet_walletUpdate_NoError() {
        walletGestor.insert(userLogged, walletDb);

        walletDb.setName(walletDb.getName() + "_CHANGED");

        walletGestor.update(userLogged, walletDb.getId(), walletDb);
    }

    @Test
    public void updateWallet_walletUpdate_effectiveUpdate() {
        final String newText = "This is new test text";
        Integer id = walletGestor.insert(userLogged, walletDb);

        walletDb.setName(newText);

        walletGestor.update(userLogged, id, walletDb);

        try (Session session = sessionFactory.openSession()) {
            Assertions.assertEquals(newText, session.get(WalletDb.class, id).getName());
        }
    }

    @Test
    public void updateWallet_changeWithSameName_throw() {
        Integer id = walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName());
        wallet2.setColor("ff0000");
        wallet2.setUserId(userLogged.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(new BigDecimal(302));

        Assertions.assertThrows(DuplicateValueException.class, () -> {
            walletGestor.update(userLogged, id, wallet2);
        });
    }

    @Test
    public void updateWallet_userNotHavePermission_throw() throws Exception {
        walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        walletDb.setName(walletDb.getName() + "_CHANGED");

        createUser("second-user-test", "second@test.ts");
        var secondUser = login("second-user-test");

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            walletGestor.update(secondUser, walletDb.getId(), wallet2);
        });
    }
}

package org.laga.moneygestor.logic.wallet;

import org.hibernate.Session;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;

public class WalletDeleteTest extends WalletLogicTest {
    
    @BeforeEach
    public void insertWallet() {
        walletGestor.insert(userLogged, walletDb);
    }

    @Test
    public void delete_userIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.deleteById(null, walletDb.getId());
        });
    }

    @Test
    public void delete_walletIdIsNull_throw() {
        Assertions.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.deleteById(userLogged, null);
        });
    }

    @Test
    public void delete_deleteCorrect() {
        walletGestor.deleteById(userLogged, walletDb.getId());
    }

    @Test
    public void delete_deleteCorrect_effectiveDelete() {
        walletGestor.deleteById(userLogged, walletDb.getId());

        try (Session session = sessionFactory.openSession()) {
            Assertions.assertNull(session.get(WalletDb.class, walletDb.getId()));
        }
    }

    @Test
    public void delete_userNotHavePermission_throw() throws Exception {
        createUser("second-user-test", "second@test.ts");
        var secondUser = login("second-user-test");

        Assertions.assertThrows(UserNotHavePermissionException.class, () -> {
            walletGestor.deleteById(secondUser, walletDb.getId());
        });
    }
}

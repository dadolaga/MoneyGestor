package org.laga.logic.wallet;

import org.hibernate.Session;
import org.hibernate.Transaction;
import org.junit.jupiter.api.*;
import org.laga.TestUtilities;
import org.laga.logic.UserRequest;
import org.laga.moneygestor.App;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.WalletGestor;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;

@Disabled
@SpringBootTest(classes = App.class)
public abstract class WalletLogicTest extends UserRequest {
    protected WalletGestor walletGestor;

    protected WalletDb walletDb;

    @BeforeEach
    public void createWallet() {
        walletGestor = new WalletGestor(sessionFactory);

        walletDb = new WalletDb();

        walletDb.setName("Wallet_test_" + TestUtilities.generateRandomString(8));
        walletDb.setValue(new BigDecimal(100));
        walletDb.setColor("ffffff");
        walletDb.setFavorite(false);
        walletDb.setUserId(userLogged.getId());
    }

    @AfterEach
    public void deleteWallet() {
        Transaction transaction;

        try (Session session = sessionFactory.openSession()) {
            transaction = session.beginTransaction();

            var query = session.createMutationQuery("DELETE FROM WalletDb WHERE userId = :id");
            query.setParameter("id", userLogged.getId());

            query.executeUpdate();

            transaction.rollback();
        }
    }
}

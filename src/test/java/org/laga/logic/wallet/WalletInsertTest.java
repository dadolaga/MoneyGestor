package org.laga.logic.wallet;

import org.hibernate.Session;
import org.junit.Assert;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;

public class WalletInsertTest extends WalletLogicTest {
   @Test
    public void insert_userIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.insert(null, walletDb);
        });
    }

    @Test
    public void insert_walletIsNull_throw() {
        Assert.assertThrows(IllegalArgumentException.class, () -> {
            walletGestor.insert(userLogged, null);
        });
    }

    @Test
    public void insert_noError() {
        walletGestor.insert(userLogged, walletDb);
    }

    @Test
    public void insert_effectiveInsert() {
        walletGestor.insert(userLogged, walletDb);

        Session session = sessionFactory.openSession();
        var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
        query.setParameter("walletName", walletDb.getName());
        WalletDb wallet = query.getSingleResultOrNull();

        Assert.assertNotNull(wallet);
    }

    @Test
    public void insert_returnNewWalletWithId_return() {
        Integer id = walletGestor.insert(userLogged, walletDb);

        Session session = sessionFactory.openSession();
        var query = session.createQuery("FROM WalletDb WHERE name = :walletName", WalletDb.class);
        query.setParameter("walletName", walletDb.getName());
        WalletDb wallet = query.getSingleResultOrNull();

        Assert.assertEquals(wallet.getId(), id);
    }

    @Test
    public void insert_duplicateName_throw() {
        walletGestor.insert(userLogged, walletDb);

        var wallet2 = new WalletDb();

        wallet2.setName(walletDb.getName());
        wallet2.setColor(walletDb.getColor());
        wallet2.setUserId(userLogged.getId());
        wallet2.setFavorite(false);
        wallet2.setValue(walletDb.getValue());

        Assert.assertThrows(DuplicateValueException.class, () -> {
            walletGestor.insert(userLogged, wallet2);
        });
    }
}

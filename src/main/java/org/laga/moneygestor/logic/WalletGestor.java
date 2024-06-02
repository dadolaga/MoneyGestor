package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.RollbackException;
import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.exception.ConstraintViolationException;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.DuplicateValueException;
import org.laga.moneygestor.logic.exceptions.TableNotEmptyException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.Wallet;

import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

public class WalletGestor extends Gestor<Integer, WalletDb> {

    public WalletGestor(SessionFactory sessionFactory) {
        super(sessionFactory);
    }

    public static Wallet convertToRest(WalletDb walletDb) {
        Wallet wallet = new Wallet();

        wallet.setId(walletDb.getId());
        wallet.setName(walletDb.getName());
        wallet.setValue(walletDb.getValue());
        wallet.setFavorite(walletDb.getFavorite());
        wallet.setColor(walletDb.getColor());

        return wallet;
    }

    public static List<Wallet> convertToRest(List<WalletDb> walletDbs) {
        List<Wallet> wallets = new LinkedList<>();

        for(var wallet : walletDbs)
            wallets.add(convertToRest(wallet));

        return wallets;
    }

    public static WalletDb convertToDb(Wallet wallet) {
        var walletDb = new WalletDb();

        walletDb.setId(wallet.getId());
        walletDb.setName(wallet.getName());
        walletDb.setColor(wallet.getColor());
        walletDb.setFavorite(wallet.getFavorite());
        walletDb.setValue(wallet.getValue());

        return walletDb;
    }

    @Override
    public Integer insert(Session session, UserDb userLogged, WalletDb walletDb) {
        if(userLogged == null || walletDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try {
            Transaction transaction = session.getTransaction();

            session.persist(walletDb);

            transaction.commit();
        } catch (ConstraintViolationException e) {
            if(e.getMessage().contains("index_wallet_nameuser"))
                throw new DuplicateValueException("Duplicate value for wallet", e);
        }

        return walletDb.getId();
    }

    @Override
    public void deleteById(Session session, UserDb userLogged, Integer id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction = session.getTransaction();

        WalletDb walletDb = getById(userLogged, id);

        if(walletDb == null)
            throw new EntityNotFoundException("Wallet with " + id + " not found");

        if(!forceDelete && !walletDb.getTransaction().isEmpty())
            throw new TableNotEmptyException("transaction table is not empty");

        if(!Objects.equals(userLogged.getId(), walletDb.getUserId()))
            throw new UserNotHavePermissionException();

        session.remove(session.contains(walletDb) ? walletDb : session.merge(walletDb));

        transaction.commit();

    }

    @Override
    public void update(Session session, UserDb userLogged, Integer walletId, WalletDb newWallet) {
        if(sessionFactory == null || walletId == null || newWallet == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newWallet.getId() != null && !Objects.equals(walletId, newWallet.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        Transaction transaction;
        try {
            transaction = session.getTransaction();

            WalletDb wallet = getById(userLogged, walletId);

            if(wallet == null)
                throw new EntityNotFoundException("Wallet with " + walletId + " not found");

            if (!Objects.equals(userLogged.getId(), wallet.getUserId()))
                throw new UserNotHavePermissionException();

            wallet.setName(newWallet.getName());
            wallet.setValue(newWallet.getValue());
            wallet.setColor(newWallet.getColor());
            wallet.setFavorite(newWallet.getFavorite());

            session.merge(wallet);

            transaction.commit();
        } catch (RollbackException e) {
            throw new DuplicateValueException("Duplicate value for wallet", e);
        }
    }

    @Override
    public void update(UserDb userGestor, WalletDb newObject) {
        update(userGestor, newObject.getId(), newObject);
    }

    @Override
    public WalletDb getById(Session session, UserDb userLogged, Integer id) {
        return session.get(WalletDb.class, id);
    }

    @Override
    public List<WalletDb> getAll(Session session, UserDb userGestor) {
        return session.createQuery("FROM WalletDb WHERE userId = :userId", WalletDb.class)
                .setParameter("userId", userGestor.getId())
                .list();
    }
}

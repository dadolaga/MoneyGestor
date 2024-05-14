package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Session;
import org.hibernate.SessionException;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.logic.exceptions.TableNotEmptyException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.models.Wallet;

import java.util.LinkedList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public class WalletGestor implements Gestor<Integer, WalletDb> {

    private final SessionFactory sessionFactory;

    public WalletGestor(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
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
    public Integer insert(UserGestor userLogged, WalletDb walletDb) {
        if(userLogged == null || walletDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(sessionFactory == null)
            throw new SessionException("Session is null");

        try (Session session = sessionFactory.openSession()) {
            Transaction transaction = session.beginTransaction();

            session.persist(walletDb);

            transaction.commit();
        }

        return null;
    }

    @Override
    public void deleteById(UserGestor userLogged, Integer id, boolean forceDelete) {
        if(userLogged == null || id == null)
            throw new IllegalArgumentException("one or more argument is null");
        if(sessionFactory == null)
            throw new SessionException("Session is null");

        Transaction transaction;

        try (Session session = sessionFactory.openSession()) {
            transaction = session.beginTransaction();

            WalletDb walletDb = getById(userLogged, id);

            if(walletDb == null)
                throw new EntityNotFoundException("Wallet with " + id + " not found");

            if(!forceDelete && !walletDb.getTransaction().isEmpty())
                throw new TableNotEmptyException("transaction table is not empty");

            if(!Objects.equals(userLogged.getId(), walletDb.getUserId()))
                throw new UserNotHavePermissionException();

            session.remove(walletDb);

            transaction.commit();
        }

    }

    @Override
    public void update(UserGestor userLogged, Integer walletId, WalletDb newWallet) {
        if(sessionFactory == null || walletId == null || newWallet == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newWallet.getId() != null && !Objects.equals(walletId, newWallet.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        Transaction transaction;
        try (Session session = sessionFactory.openSession()) {
            transaction = session.beginTransaction();

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
        }
    }

    @Override
    public void update(UserGestor userGestor, WalletDb newObject) {
        update(userGestor, newObject.getId(), newObject);
    }

    @Override
    public WalletDb getById(UserGestor userLogged, Integer id) {
        Session session = sessionFactory.openSession();

        return session.get(WalletDb.class, id);
    }

    @Override
    public Stream<WalletDb> getAll(UserGestor userGestor) {
        Session session = sessionFactory.openSession();

        var query = session.createQuery("FROM WalletDb WHERE userId = :userId", WalletDb.class);
        query.setParameter("userId", userGestor.getId());

        return query.getResultStream();
    }
}

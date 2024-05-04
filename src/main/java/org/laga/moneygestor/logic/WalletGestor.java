package org.laga.moneygestor.logic;

import jakarta.persistence.EntityNotFoundException;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.db.repository.WalletRepository;
import org.laga.moneygestor.logic.exceptions.TableNotEmptyException;
import org.laga.moneygestor.logic.exceptions.UserNotHavePermissionException;
import org.laga.moneygestor.services.WalletRest;
import org.laga.moneygestor.services.models.User;
import org.laga.moneygestor.services.models.Wallet;

import java.util.LinkedList;
import java.util.List;
import java.util.Objects;

public class WalletGestor {

    public static void insertWallet(WalletRepository walletRepository, WalletDb walletDb) {
        if(walletRepository == null || walletDb == null)
            throw new IllegalArgumentException("one or more argument is null");

        walletRepository.save(walletDb);
    }

    public static void deleteWallet(WalletRepository walletRepository, UserGestor userLogged, Integer walletId) {
        deleteWallet(walletRepository, userLogged, walletId, false);
    }

    public static void deleteWallet(WalletRepository walletRepository, UserGestor userLogged, Integer walletId, boolean forceDelete) {
        if(walletRepository == null || walletId == null)
            throw new IllegalArgumentException("one or more argument is null");

        var walletDb = walletRepository.findById(walletId);

        if(walletDb.isEmpty())
            throw new EntityNotFoundException("Wallet with " + walletId + " not found");

        deleteWallet(walletRepository, userLogged, walletDb.get(), forceDelete);
    }

    public static void deleteWallet(WalletRepository walletRepository, UserGestor userLogged, WalletDb walletDb) {
        deleteWallet(walletRepository, userLogged, walletDb, false);
    }

    public static void deleteWallet(WalletRepository walletRepository, UserGestor userLogged, WalletDb walletDb, boolean forceDelete) {
        if(walletRepository == null || walletDb == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(walletDb.getId() == null)
            throw new IllegalArgumentException("id of wallet is null");

        if(!forceDelete && !walletDb.getTransaction().isEmpty())
            throw new TableNotEmptyException("transaction table is not empty");

        if(!Objects.equals(userLogged.getId(), walletDb.getUserId()))
            throw new UserNotHavePermissionException();

        walletRepository.deleteById(walletDb.getId());
    }
    public static void updateWallet(WalletRepository walletRepository, UserGestor userLogged, Integer walletId, WalletDb newWallet) {
        if(walletRepository == null || walletId == null || newWallet == null || userLogged == null)
            throw new IllegalArgumentException("one or more argument is null");

        if(newWallet.getId() != null && !Objects.equals(walletId, newWallet.getId()))
            throw new IllegalArgumentException("walletId and newWallet id must be the same");

        var optionalOldWallet = walletRepository.findById(walletId);

        if(optionalOldWallet.isEmpty())
            throw new EntityNotFoundException("Wallet with " + walletId + " not found");

        if(!Objects.equals(userLogged.getId(), optionalOldWallet.get().getUserId()))
            throw new UserNotHavePermissionException();

        WalletDb wallet = optionalOldWallet.get();

        wallet.setName(newWallet.getName());
        wallet.setValue(newWallet.getValue());
        wallet.setColor(newWallet.getColor());
        wallet.setFavorite(newWallet.getFavorite());

        walletRepository.save(wallet);
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
}

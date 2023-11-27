package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.services.json.Wallet;

import java.util.LinkedList;
import java.util.List;

public class WalletGestor {
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
}

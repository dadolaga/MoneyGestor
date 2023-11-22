package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.services.json.Wallet;

import java.util.LinkedList;
import java.util.List;

public class WalletGestor {
    public static Wallet convertToRest(WalletDb walletDb) {
        return new Wallet(walletDb.getId(), walletDb.getName(), walletDb.getValue(), walletDb.getFavorite());
    }

    public static List<Wallet> convertToRest(List<WalletDb> walletDbs) {
        List<Wallet> wallets = new LinkedList<>();

        for(var wallet : walletDbs)
            wallets.add(convertToRest(wallet));

        return wallets;
    }
}

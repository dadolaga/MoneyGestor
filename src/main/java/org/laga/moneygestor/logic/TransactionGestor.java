package org.laga.moneygestor.logic;

import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.laga.moneygestor.services.json.Transaction;
import org.laga.moneygestor.services.json.Wallet;

import java.time.format.DateTimeFormatter;
import java.util.LinkedList;
import java.util.List;

public class TransactionGestor {
    public static Transaction convertToRest(TransactionDb transactionDb) {
        Transaction transaction = new Transaction();

        transaction.setId(transactionDb.getId());
        transaction.setDescription(transactionDb.getDescription());
        transaction.setValue(transactionDb.getValue());
        transaction.setWallet(transactionDb.getWallet());
        transaction.setDate(transactionDb.getDate().format(DateTimeFormatter.ISO_DATE));

        return transaction;
    }

    public static List<Transaction> convertToRest(List<TransactionDb> transactionDbs) {
        List<Transaction> transactions = new LinkedList<>();

        for(var transaction : transactionDbs)
            transactions.add(convertToRest(transaction));

        return transactions;
    }
}

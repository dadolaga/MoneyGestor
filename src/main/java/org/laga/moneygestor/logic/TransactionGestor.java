package org.laga.moneygestor.logic;

import org.hibernate.SessionFactory;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.UserDb;
import org.laga.moneygestor.services.models.Transaction;

import java.time.format.DateTimeFormatter;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Stream;

public class TransactionGestor implements Gestor<Long, TransactionDb> {
    private final SessionFactory sessionFactory;

    public TransactionGestor(SessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }
    public static Transaction convertToRest(TransactionDb transactionDb) {
        Transaction transaction = new Transaction();

        transaction.setId(transactionDb.getId());
        transaction.setDescription(transactionDb.getDescription());
        transaction.setValue(transactionDb.getValue());
        transaction.setWallet(transactionDb.getWallet());
        transaction.setWalletDestination(transactionDb.getTransactionDestination() != null? transactionDb.getTransactionDestination().getWallet() : null);
        transaction.setDate(transactionDb.getDate().format(DateTimeFormatter.ISO_DATE));
        transaction.setType(transactionDb.getType());

        return transaction;
    }

    public static List<Transaction> convertToRest(List<TransactionDb> transactionDbs) {
        List<Transaction> transactions = new LinkedList<>();

        for(var transaction : transactionDbs)
            transactions.add(convertToRest(transaction));

        return transactions;
    }

    @Override
    public Long insert(UserDb userLogged, TransactionDb object) {
        return null;
    }

    @Override
    public void deleteById(UserDb userLogged, Long aLong, boolean forceDelete) {

    }

    @Override
    public void update(UserDb userLogged, TransactionDb newObject) {

    }

    @Override
    public void update(UserDb userLogged, Long aLong, TransactionDb newObject) {

    }

    @Override
    public TransactionDb getById(UserDb userLogged, Long aLong) {
        return null;
    }

    @Override
    public List<TransactionDb> getAll(UserDb userLogged) {
        return null;
    }
}

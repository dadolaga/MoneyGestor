package org.laga.moneygestor.services.models;

import java.util.List;

public class MultiTransactionInsert {
    List<TransactionForm> transactions;
    Integer walletId;

    public List<TransactionForm> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<TransactionForm> transactions) {
        this.transactions = transactions;
    }

    public Integer getWalletId() {
        return walletId;
    }

    public void setWalletId(Integer walletId) {
        this.walletId = walletId;
    }
}

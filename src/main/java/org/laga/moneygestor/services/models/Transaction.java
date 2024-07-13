package org.laga.moneygestor.services.models;

import java.math.BigDecimal;

public class Transaction {
    private Long id;
    private String description;
    private BigDecimal value;
    private String date;
    private Wallet wallet;
    private Wallet walletDestination;
    private TransactionType type;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public Wallet getWallet() {
        return wallet;
    }

    public void setWallet(Wallet wallet) {
        this.wallet = wallet;
    }

    public Wallet getWalletDestination() {
        return walletDestination;
    }

    public void setWalletDestination(Wallet walletDestination) {
        this.walletDestination = walletDestination;
    }

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }
}

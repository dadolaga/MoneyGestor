package org.laga.moneygestor.services.json;

import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.laga.moneygestor.db.entity.WalletDb;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class Transaction {
    private Integer id;
    private String description;
    private BigDecimal value;
    private String date;
    private WalletDb wallet;
    private TransactionTypeDb type;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
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

    public WalletDb getWallet() {
        return wallet;
    }

    public void setWallet(WalletDb wallet) {
        this.wallet = wallet;
    }

    public TransactionTypeDb getType() {
        return type;
    }

    public void setType(TransactionTypeDb type) {
        this.type = type;
    }
}

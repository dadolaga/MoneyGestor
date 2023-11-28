package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transaction_table")
public class TransactionTableView {
    @Id
    private Integer id;
    private String description;
    @Column(updatable = false, insertable = false)
    private BigDecimal value;
    private LocalDate date;
    @ManyToOne
    @JoinColumn(name = "type", nullable = false, updatable = false, insertable = false)
    private TransactionTypeDb type;
    @ManyToOne
    @JoinColumn(name = "wallet", nullable = false, updatable = false, insertable = false)
    private WalletDb wallet;
    @Column(name = "transactiondestination")
    private Integer transactionDestination;
    private Integer user;
    @ManyToOne
    @JoinColumn(name = "walletdestination", nullable = false, updatable = false, insertable = false)
    private WalletDb walletDestination;

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
        description = description;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public TransactionTypeDb getType() {
        return type;
    }

    public void setType(TransactionTypeDb type) {
        this.type = type;
    }

    public WalletDb getWallet() {
        return wallet;
    }

    public void setWallet(WalletDb wallet) {
        this.wallet = wallet;
    }

    public Integer getTransactionDestination() {
        return transactionDestination;
    }

    public void setTransactionDestination(Integer transactionDestination) {
        this.transactionDestination = transactionDestination;
    }

    public Integer getUser() {
        return user;
    }

    public void setUser(Integer user) {
        this.user = user;
    }

    public WalletDb getWalletDestination() {
        return walletDestination;
    }

    public void setWalletDestination(WalletDb walletDestination) {
        this.walletDestination = walletDestination;
    }
}

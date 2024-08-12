package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Subselect;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Immutable
@Subselect("select t1.Id AS id," +
        "    t1.Description AS description," +
        "    t1.Value AS value," +
        "    t1.Date AS date," +
        "    t1.Type AS type," +
        "    t1.Wallet AS wallet," +
        "    t1.TransactionDestination AS transaction_destination," +
        "    t1.User AS user," +
        "    t2.Wallet AS wallet_destination " +
        "from (transaction t1 left join transaction t2 on (t1.TransactionDestination = t2.Id)) where t1.TransactionDestination is null or t1.Value < 0")
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
    @Column(name = "transaction_destination")
    private Integer transactionDestination;
    private Integer user;
    @ManyToOne
    @JoinColumn(name = "wallet_destination", nullable = false, updatable = false, insertable = false)
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
        this.description = description;
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

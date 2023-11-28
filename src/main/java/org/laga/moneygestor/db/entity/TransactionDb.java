package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transaction")
public class TransactionDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String description;
    private BigDecimal value;
    private LocalDate date;
    @Column(name = "wallet")
    private Integer walletId;
    @ManyToOne
    @JoinColumn(name = "wallet", nullable = false, insertable = false, updatable = false)
    private WalletDb wallet;
    @Column(name = "transactiondestination ")
    private Integer transactionDestinationId;
    @Column(name = "user")
    private Integer userId;
    @ManyToOne
    @JoinColumn(name = "type", nullable = false, insertable = false, updatable = false)
    private TransactionTypeDb type;
    @Column(name = "Type")
    private Integer typeId;

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

    public Integer getWalletId() {
        return walletId;
    }

    public void setWalletId(Integer walletId) {
        this.walletId = walletId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public WalletDb getWallet() {
        return wallet;
    }

    public void setWallet(WalletDb wallet) {
        this.wallet = wallet;
    }

    public Integer getTransactionDestinationId() {
        return transactionDestinationId;
    }

    public void setTransactionDestinationId(Integer transactionDestinationId) {
        this.transactionDestinationId = transactionDestinationId;
    }

    public TransactionTypeDb getType() {
        return type;
    }

    public void setType(TransactionTypeDb type) {
        this.type = type;
    }

    public Integer getTypeId() {
        return typeId;
    }

    public void setTypeId(Integer typeId) {
        this.typeId = typeId;
    }

    @Override
    public String toString() {
        return "TransactionDb{" +
                "id=" + id +
                ", description='" + description + '\'' +
                ", value=" + value +
                ", date=" + date +
                ", walletId=" + walletId +
                ", wallet=" + wallet +
                ", userId=" + userId +
                '}';
    }
}

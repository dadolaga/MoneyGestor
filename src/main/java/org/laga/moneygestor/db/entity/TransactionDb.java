package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transaction")
public class TransactionDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 1024)
    private String description;
    @Column(length = 4096)
    private String longDescription;
    @Column(nullable = false)
    private BigDecimal value;
    @Column(nullable = false)
    private LocalDate date;
    @Column(name = "wallet", nullable = false)
    private Integer walletId;
    @ManyToOne
    @JoinColumn(name = "wallet", nullable = false, insertable = false, updatable = false)
    private WalletDb wallet;
    @ManyToOne
    @JoinColumn(name = "transaction_destination", insertable = false, updatable = false)
    private TransactionDb transactionDestination;
    @Column(name = "transaction_destination")
    private Long transactionDestinationId;
    @ManyToOne
    @JoinColumn(name = "user_transaction", nullable = false, insertable = false, updatable = false)
    private UserDb userOfTransaction;
    @Column(name = "user_transaction", nullable = false)
    private Integer userOfTransactionId;
    @ManyToOne
    @JoinColumn(name = "user_insert", nullable = false, insertable = false, updatable = false)
    private UserDb userInsertTransaction;
    @Column(name = "user_insert", nullable = false)
    private Integer userInsertTransactionId;
    @ManyToOne
    @JoinColumn(name = "type", nullable = false, insertable = false, updatable = false)
    private TransactionTypeDb type;
    @Column(name = "type", nullable = false)
    private Integer typeId;

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

    public String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(String longDescription) {
        this.longDescription = longDescription;
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

    public UserDb getUserOfTransaction() {
        return userOfTransaction;
    }

    public void setUserOfTransaction(UserDb userOfTransaction) {
        this.userOfTransaction = userOfTransaction;
    }

    public Integer getUserOfTransactionId() {
        return userOfTransactionId;
    }

    public void setUserOfTransactionId(Integer userOfTransactionId) {
        this.userOfTransactionId = userOfTransactionId;
    }

    public UserDb getUserInsertTransaction() {
        return userInsertTransaction;
    }

    public void setUserInsertTransaction(UserDb userInsertTransaction) {
        this.userInsertTransaction = userInsertTransaction;
    }

    public Integer getUserInsertTransactionId() {
        return userInsertTransactionId;
    }

    public void setUserInsertTransactionId(Integer userInsertTransactionId) {
        this.userInsertTransactionId = userInsertTransactionId;
    }

    public WalletDb getWallet() {
        return wallet;
    }

    public void setWallet(WalletDb wallet) {
        this.wallet = wallet;
    }

    public TransactionDb getTransactionDestination() {
        return transactionDestination;
    }

    public void setTransactionDestination(TransactionDb transactionDestination) {
        this.transactionDestination = transactionDestination;
    }

    public Long getTransactionDestinationId() {
        return transactionDestinationId;
    }

    public void setTransactionDestinationId(Long transactionDestinationId) {
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
                //", transactionDestination=" + transactionDestination +
                ", transactionDestinationId=" + transactionDestinationId +
                ", userId=" + userOfTransactionId +
                ", type=" + type +
                ", typeId=" + typeId +
                '}';
    }
}

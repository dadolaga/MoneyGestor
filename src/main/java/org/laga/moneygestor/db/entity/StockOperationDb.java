package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "stock_operation")
public class StockOperationDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 1024)
    private String description;
    @Column(nullable = false)
    private BigDecimal value;
    @Column(nullable = false)
    private BigDecimal currentStockValue;
    @Column(name = "current_yield", nullable = true, columnDefinition = "DECIMAL(10, 10)")
    private BigDecimal currentYield;
    @Column(nullable = false)
    private LocalDate date;
    @Column(name = "is_tfr", nullable = false)
    private Boolean isTfr;
    @Column(name = "bank_transaction", nullable = true)
    private Long bankTransactionId;
    @ManyToOne(fetch = FetchType.EAGER)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "bank_transaction", nullable = true, insertable = false, updatable = false)
    private TransactionDb bankTransaction;
    @Column(name = "stock")
    private Integer stockId;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stock", nullable = false, insertable = false, updatable = false)
    private StockDb stock;
    @ManyToOne
    @JoinColumn(name = "user", nullable = false, insertable = false, updatable = false)
    private UserDb user;
    @Column(name = "user", nullable = false)
    private Integer userId;

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

    public BigDecimal getCurrentStockValue() {
        return currentStockValue;
    }

    public void setCurrentStockValue(BigDecimal currentStockValue) {
        this.currentStockValue = currentStockValue;
    }

    public BigDecimal getCurrentYield() {
        return currentYield;
    }

    public void setCurrentYield(BigDecimal currentYield) {
        this.currentYield = currentYield;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Boolean getTfr() {
        return isTfr;
    }

    public void setTfr(Boolean tfr) {
        isTfr = tfr;
    }

    public Long getBankTransactionId() {
        return bankTransactionId;
    }

    public void setBankTransactionId(Long bankTransactionId) {
        this.bankTransactionId = bankTransactionId;
    }

    public TransactionDb getBankTransaction() {
        return bankTransaction;
    }

    public void setBankTransaction(TransactionDb bankTransaction) {
        this.bankTransaction = bankTransaction;
    }

    public Integer getStockId() {
        return stockId;
    }

    public void setStockId(Integer stockId) {
        this.stockId = stockId;
    }

    public StockDb getStock() {
        return stock;
    }

    public void setStock(StockDb stock) {
        this.stock = stock;
    }

    public UserDb getUser() {
        return user;
    }

    public void setUser(UserDb user) {
        this.user = user;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }
}

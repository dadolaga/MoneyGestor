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
    private LocalDate date;
    @Column(name = "bank_deposit", nullable = false)
    private Boolean bankDeposit;
    @Column(name = "stock", nullable = false)
    private Integer stockId;
    @ManyToOne
    @JoinColumn(name = "stock", nullable = false, insertable = false, updatable = false)
    private StockDb stock;

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

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Boolean getBankDeposit() {
        return bankDeposit;
    }

    public void setBankDeposit(Boolean bankDeposit) {
        this.bankDeposit = bankDeposit;
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
}

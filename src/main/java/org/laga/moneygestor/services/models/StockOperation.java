package org.laga.moneygestor.services.models;


import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;

public class StockOperation {
    private Long id;
    private String description;
    private BigDecimal value;
    @JsonProperty("current_yield")
    private BigDecimal currentYield;
    private LocalDate date;
    @JsonProperty("is_bank_deposit")
    private Boolean isBankDeposit;
    @JsonProperty("is_tfr")
    private Boolean isTfr;
    private Stock stock;

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

    public Boolean isBankDeposit() {
        return isBankDeposit;
    }

    public void setBankDeposit(Boolean bankDeposit) {
        isBankDeposit = bankDeposit;
    }

    public Boolean isTfr() {
        return isTfr;
    }

    public void setTfr(Boolean tfr) {
        isTfr = tfr;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }
}

package org.laga.moneygestor.services.json;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TransactionForm {
    private String description;
    private String date;
    private BigDecimal value;
    private Integer wallet;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public Integer getWallet() {
        return wallet;
    }

    public void setWallet(Integer wallet) {
        this.wallet = wallet;
    }
}

package org.laga.moneygestor.services.models;

import java.math.BigDecimal;

public class TransactionForm {
    private String description;
    private String date;
    private BigDecimal value;
    private Integer wallet;
    private Integer walletDestination;
    private Integer typeId;

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

    public Integer getWalletDestination() {
        return walletDestination;
    }

    public void setWalletDestination(Integer walletDestination) {
        this.walletDestination = walletDestination;
    }

    public Integer getTypeId() {
        return typeId;
    }

    public void setTypeId(Integer typeId) {
        this.typeId = typeId;
    }
}

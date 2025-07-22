package org.laga.moneygestor.services.models;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Stock {
    private Integer id;
    private String name;
    private BigDecimal subscriptionValue;
    private LocalDateTime subscriptionDate;
    private BigDecimal currentValue;
    private BigDecimal resourcesInvested;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getSubscriptionValue() {
        return subscriptionValue;
    }

    public void setSubscriptionValue(BigDecimal subscriptionValue) {
        this.subscriptionValue = subscriptionValue;
    }

    public LocalDateTime getSubscriptionDate() {
        return subscriptionDate;
    }

    public void setSubscriptionDate(LocalDateTime subscriptionDate) {
        this.subscriptionDate = subscriptionDate;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }

    public BigDecimal getResourcesInvested() {
        return resourcesInvested;
    }

    public void setResourcesInvested(BigDecimal resourcesInvested) {
        this.resourcesInvested = resourcesInvested;
    }
}

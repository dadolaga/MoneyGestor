package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity
@Table(name = "stock")
public class StockDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    @Column(name = "subscription_date")
    private LocalDateTime subscriptionDate;
    @Column(name = "subscription_value")
    private BigDecimal subscriptionValue;
    @Column(name = "current_value")
    private BigDecimal currentValue;
    @Column(name = "resources_invested")
    private BigDecimal resourcesInvested;
    @ManyToOne
    @JoinColumn(name = "user", nullable = false, insertable = false, updatable = false)
    private UserDb user;
    @Column(name = "user", nullable = false)
    private Integer userId;

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

    public LocalDateTime getSubscriptionDate() {
        return subscriptionDate;
    }

    public void setSubscriptionDate(LocalDateTime subscriptionDate) {
        this.subscriptionDate = subscriptionDate;
    }

    public BigDecimal getSubscriptionValue() {
        return subscriptionValue;
    }

    public void setSubscriptionValue(BigDecimal subscriptionValue) {
        this.subscriptionValue = subscriptionValue;
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

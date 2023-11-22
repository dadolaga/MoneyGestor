package org.laga.moneygestor.services.json;

import java.math.BigDecimal;

public class Wallet {
    private Integer id;
    private String name;
    private BigDecimal value;
    private Boolean favorite;

    public Wallet() {
    }

    public Wallet(Integer id, String name, BigDecimal value, Boolean favorite) {
        this.id = id;
        this.name = name;
        this.value = value;
        this.favorite = favorite;
    }

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

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public Boolean getFavorite() {
        return favorite;
    }

    public void setFavorite(Boolean favorite) {
        this.favorite = favorite;
    }
}

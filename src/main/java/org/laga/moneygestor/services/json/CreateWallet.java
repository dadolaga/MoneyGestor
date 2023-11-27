package org.laga.moneygestor.services.json;

import java.math.BigDecimal;

public class CreateWallet {
    private String token;
    private String name;
    private BigDecimal value;
    private Integer color;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
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

    public Integer getColor() {
        return color;
    }

    public void setColor(Integer color) {
        this.color = color;
    }

    @Override
    public String toString() {
        return "CreateWallet{" +
                "token='" + token + '\'' +
                ", name='" + name + '\'' +
                ", value=" + value +
                ", color=" + color +
                '}';
    }
}

package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.Set;

@Entity
@Table(name = "wallet", indexes =
    @Index(name = "index_wallet_nameuser", columnList = "name, user", unique = true))
public class WalletDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    private BigDecimal value;
    @Column(name = "user")
    private Integer userId;
    private Boolean favorite;
    private String color;
    @OneToMany(mappedBy = "wallet")
    private Set<TransactionDb> transaction;

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

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer user) {
        this.userId = user;
    }

    public Boolean getFavorite() {
        return favorite;
    }

    public void setFavorite(Boolean favorite) {
        this.favorite = favorite;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Set<TransactionDb> getTransaction() {
        return transaction;
    }

    @Override
    public String toString() {
        return "WalletDb{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", value=" + value +
                ", userId=" + userId +
                ", favorite=" + favorite +
                ", color='" + color + '\'' +
                '}';
    }
}

package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.util.Set;

@Entity
@Table(name = "transaction_type", indexes = {
        @Index(name = "index_transactionType_nameuser", columnList = "name, user", unique = true)
})
public class TransactionTypeDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    @Column(name = "user")
    private Integer userId;
    @OneToMany(mappedBy = "type")
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

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Set<TransactionDb> getTransaction() {
        return transaction;
    }
}

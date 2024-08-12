package org.laga.moneygestor.db.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Subselect;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Immutable
@Subselect("select concat(transaction.Wallet, '_', unix_timestamp(transaction.Date)) AS uuid," +
        "        transaction.Wallet AS wallet," +
        "        transaction.Date AS date," +
        "        sum(transaction.Value) AS value " +
        "from transaction " +
        "group by transaction.Date," +
        "        transaction.Wallet " +
        "order by transaction.Date")
public class TransactionGraphView {

    @Id
    private String uuid;
    private Integer wallet;
    private LocalDate date;
    private BigDecimal value;

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public Integer getWallet() {
        return wallet;
    }

    public void setWallet(Integer wallet) {
        this.wallet = wallet;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }
}

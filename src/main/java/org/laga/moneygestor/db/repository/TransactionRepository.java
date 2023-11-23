package org.laga.moneygestor.db.repository;

import jakarta.transaction.Transactional;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface TransactionRepository extends JpaRepository<TransactionDb, Integer> {
    @Transactional
    @Modifying
    @Query(value = "UPDATE transaction SET Description = :description, Value = :value, Date = :date, Wallet = :wallet WHERE Id = :id AND User = :userId", nativeQuery = true)
    int editWallet(@Param("id") Integer transactionId, @Param("description") String description, @Param("value") BigDecimal value, @Param("date") String date, @Param("wallet") Integer walletId, @Param("userId") Integer userId);
}

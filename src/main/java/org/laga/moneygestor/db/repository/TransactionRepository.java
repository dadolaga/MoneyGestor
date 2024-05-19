package org.laga.moneygestor.db.repository;

import jakarta.transaction.Transactional;
import org.laga.moneygestor.db.entity.TransactionDb;
import org.laga.moneygestor.db.entity.WalletDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<TransactionDb, Long> {
    @Transactional
    @Modifying
    @Query(value = "UPDATE transaction SET Description = :description, Value = :value, Date = :date, Wallet = :wallet, type = :type WHERE Id = :id AND User = :userId", nativeQuery = true)
    int editWallet(@Param("id") Long transactionId, @Param("description") String description, @Param("value") BigDecimal value, @Param("date") String date, @Param("wallet") Integer walletId, @Param("type") Integer typeId, @Param("userId") Integer userId);
}

package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TransactionTypeRepository extends JpaRepository<TransactionTypeDb, Integer> {
    @Query(value = "SELECT * FROM transaction_type WHERE User = :user OR User IS NULL ORDER BY User, Name", nativeQuery = true)
    List<TransactionTypeDb> findWithUserOrNull(@Param("user") Integer userId);

}

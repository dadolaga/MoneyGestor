package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.TransactionDb;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<TransactionDb, Integer> {
}

package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.TransactionTypeDb;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionTypeRepository extends JpaRepository<TransactionTypeDb, Integer> {
}

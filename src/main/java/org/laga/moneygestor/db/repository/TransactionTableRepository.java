package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.TransactionTableView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionTableRepository extends JpaRepository<TransactionTableView, Integer> {
}

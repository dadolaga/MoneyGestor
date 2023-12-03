package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.TransactionGraphView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionGraphRepository extends JpaRepository<TransactionGraphView, String> {
}

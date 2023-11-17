package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletRepository extends JpaRepository<Wallet, Integer> {
}

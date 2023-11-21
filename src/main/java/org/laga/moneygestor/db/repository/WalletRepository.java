package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.WalletDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WalletRepository extends JpaRepository<WalletDb, Integer> {
    @Query(value = "SELECT w.* FROM wallet w WHERE w.User = :userId", nativeQuery = true)
    List<WalletDb> getWalletsFromUser(@Param("userId") Integer userId);

    @Query(value = "SELECT w.* FROM wallet w WHERE w.Id = :walletId AND w.User = :userId", nativeQuery = true)
    WalletDb getWalletsFromId(@Param("walletId") Integer walletId, @Param("userId") Integer userId);
}

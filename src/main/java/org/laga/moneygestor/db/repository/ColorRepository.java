package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.ColorDb;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColorRepository extends JpaRepository<ColorDb, Integer> {
}

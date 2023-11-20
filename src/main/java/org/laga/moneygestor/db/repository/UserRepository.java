package org.laga.moneygestor.db.repository;

import jakarta.transaction.Transactional;
import org.laga.moneygestor.db.entity.UserDb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface UserRepository extends JpaRepository<UserDb, Integer> {
    @Query(value = "SELECT u.* FROM user u WHERE u.username = :username OR u.email = :username", nativeQuery = true)
    UserDb findWithEmailOrUsername(@Param("username") String username);

    @Query(value = "SELECT u.* FROM user u WHERE u.Token = :token", nativeQuery = true)
    UserDb findFromToken(@Param("token") String token);

    @Transactional
    @Modifying
    @Query(value = "UPDATE user SET Token = :token, ExpiratedToken = :expireToken WHERE Id = :id", nativeQuery = true)
    void updateToken(@Param("id") Integer id, @Param("token") String token, @Param("expireToken") LocalDateTime expireToken);
}

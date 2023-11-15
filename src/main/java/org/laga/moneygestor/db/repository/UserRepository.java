package org.laga.moneygestor.db.repository;

import org.laga.moneygestor.db.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    @Query(value = "SELECT u.* FROM user u WHERE u.username = :username", nativeQuery = true)
    User findUsersFromUsername(@Param("username") String username);
}

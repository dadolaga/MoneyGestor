package org.laga.moneygestor.db.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "login", indexes = {
        @Index(name = "unique_token", columnList = "token", unique = true)
})
public class LoginDb {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne
    @JoinColumn(name = "user", nullable = false, insertable = false, updatable = false)
    private UserDb user;
    @Column(name = "user", nullable = false)
    private Integer userId;
    @Column(columnDefinition = "char(128)")
    private String token;
    @Column(name = "expirated_token")
    private LocalDateTime expiratedToken;

    public UserDb getUser() {
        return user;
    }

    public void setUser(UserDb user) {
        this.user = user;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public LocalDateTime getExpiratedToken() {
        return expiratedToken;
    }

    public void setExpiratedToken(LocalDateTime expiratedToken) {
        this.expiratedToken = expiratedToken;
    }
}

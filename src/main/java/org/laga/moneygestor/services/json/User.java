package org.laga.moneygestor.services.json;

import java.time.LocalDateTime;

public class User {
    private String lastname;
    private String firstname;
    private String token;
    private LocalDateTime expireToken;

    public User(String lastname, String firstname, String token, LocalDateTime expireToken) {
        this.lastname = lastname;
        this.firstname = firstname;
        this.token = token;
        this.expireToken = expireToken;
    }

    public String getLastname() {
        return lastname;
    }

    public void setLastname(String lastname) {
        this.lastname = lastname;
    }

    public String getFirstname() {
        return firstname;
    }

    public void setFirstname(String firstname) {
        this.firstname = firstname;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public LocalDateTime getExpireToken() {
        return expireToken;
    }

    public void setExpireToken(LocalDateTime expireToken) {
        this.expireToken = expireToken;
    }
}

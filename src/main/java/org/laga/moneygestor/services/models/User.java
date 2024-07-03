package org.laga.moneygestor.services.models;

import java.time.LocalDateTime;

public class User {
    private String lastname;
    private String firstname;
    private String token;
    private LocalDateTime expireToken;

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

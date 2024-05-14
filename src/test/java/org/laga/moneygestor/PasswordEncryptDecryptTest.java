package org.laga.moneygestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.logic.UserGestor;

public class PasswordEncryptDecryptTest {
    @Test
    public void encryptPassword() {
        final String password = "HelloThisIsMyPassword";

        Assertions.assertNotNull(UserGestor.passwordEncrypt(password));
    }

    @Test
    public void decryptPassword() {
        final String password = "HelloThisIsMyPassword";
        final String passwordHash = UserGestor.passwordEncrypt(password);

        Assertions.assertTrue(UserGestor.checkPassword(password, passwordHash));
    }

    @Test
    public void decryptWrongPassword() {
        final String password = "HelloThisIsMyPassword";
        final String passwordHash = UserGestor.passwordEncrypt(password);

        Assertions.assertFalse(UserGestor.checkPassword("HelloThisNotIsMyPassword", passwordHash));
    }
}

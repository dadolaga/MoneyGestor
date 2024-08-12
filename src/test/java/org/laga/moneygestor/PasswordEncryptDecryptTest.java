package org.laga.moneygestor;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.laga.moneygestor.logic.PasswordUtilities;

public class PasswordEncryptDecryptTest {
    @Test
    public void encryptPassword() {
        final String password = "HelloThisIsMyPassword";

        Assertions.assertNotNull(PasswordUtilities.passwordEncrypt(password));
    }

    @Test
    public void decryptPassword() {
        final String password = "HelloThisIsMyPassword";
        final String passwordHash = PasswordUtilities.passwordEncrypt(password);

        Assertions.assertTrue(PasswordUtilities.checkPassword(password, passwordHash));
    }

    @Test
    public void decryptWrongPassword() {
        final String password = "HelloThisIsMyPassword";
        final String passwordHash = PasswordUtilities.passwordEncrypt(password);

        Assertions.assertFalse(PasswordUtilities.checkPassword("HelloThisNotIsMyPassword", passwordHash));
    }
}

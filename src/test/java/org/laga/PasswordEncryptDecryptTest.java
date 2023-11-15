package org.laga;

import org.junit.Assert;
import org.junit.Test;
import org.laga.moneygestor.logic.UserGestor;

public class PasswordEncryptDecryptTest {
    @Test
    public void encryptPassword() {
        final String password = "HelloThisIsMyPassword";

        Assert.assertNotNull(UserGestor.passwordEncrypt(password));
    }

    @Test
    public void decryptPassword() {
        final String password = "HelloThisIsMyPassword";
        final String passwordHash = UserGestor.passwordEncrypt(password);

        Assert.assertTrue(UserGestor.checkPassword(password, passwordHash));
    }
}

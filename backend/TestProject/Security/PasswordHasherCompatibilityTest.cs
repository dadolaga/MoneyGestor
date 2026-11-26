namespace TestProject.Security;

[TestFixture]
[Category("Unit")]
internal sealed class PasswordHasherCompatibilityTest {
    // Generated with the legacy Rfc2898DeriveBytes constructor and a fixed salt.
    private const String LegacyHash = "10000:AAECAwQFBgcICQoLDA0ODw==:OOjNIrFoK0fbOvpPG5rvv8G/AyAObB8CqR3jZhuk938=";

    [Test]
    public void ExistingPasswordHashStillVerifies() {
        Assert.That(global::PasswordHasher.Verify("legacy-password", LegacyHash), Is.True);
        Assert.That(global::PasswordHasher.Verify("wrong-password", LegacyHash), Is.False);
    }
}
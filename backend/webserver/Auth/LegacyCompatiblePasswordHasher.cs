using database.Identity;
using Microsoft.AspNetCore.Identity;

namespace webserver.Auth;

public sealed class LegacyCompatiblePasswordHasher : IPasswordHasher<ApplicationIdentityUser> {
    private readonly PasswordHasher<ApplicationIdentityUser> identityHasher = new();

    public String HashPassword(ApplicationIdentityUser user, String password) =>
        identityHasher.HashPassword(user, password);

    public PasswordVerificationResult VerifyHashedPassword(
        ApplicationIdentityUser user,
        String hashedPassword,
        String providedPassword) {
        if (hashedPassword.Count(character => character == ':') == 2) {
            try {
                return global::PasswordHasher.Verify(providedPassword, hashedPassword)
                    ? PasswordVerificationResult.SuccessRehashNeeded
                    : PasswordVerificationResult.Failed;
            } catch (FormatException) {
                return PasswordVerificationResult.Failed;
            } catch (OverflowException) {
                return PasswordVerificationResult.Failed;
            } catch (ArgumentException) {
                return PasswordVerificationResult.Failed;
            }
        }

        return identityHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
    }
}

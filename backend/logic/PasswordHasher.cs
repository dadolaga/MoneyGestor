using System.Security.Cryptography;
using System.Text;

public static class PasswordHasher {
    // Constants for PBKDF2 settings
    private const Int32 SaltSize = 16;       // 128-bit salt
    private const Int32 KeySize = 32;        // 256-bit hash key
    private const Int32 Iterations = 10000;  // High iteration count for security

    // Character used to separate the Iterations, Salt, and Hash in the stored string
    private const Char Separator = ':';

    /// <summary>
    /// Hashes the plain text password using PBKDF2.
    /// </summary>
    /// <param name="password">The plain text password.</param>
    /// <returns>A string containing the Iterations, Salt, and Hash, separated by the Separator.</returns>
    public static String Hash(String password) {
        Byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

        // Hash the password using the salt and iterations
        using var algorithm = new Rfc2898DeriveBytes(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256
        );
        Byte[] key = algorithm.GetBytes(KeySize);

        return $"{Iterations}{Separator}{Convert.ToBase64String(salt)}{Separator}{Convert.ToBase64String(key)}";
    }

    /// <summary>
    /// Verifies a plain text password against a stored hash.
    /// </summary>
    /// <param name="password">The plain text password to check.</param>
    /// <param name="hashedPassword">The stored hash string (Iterations:Salt:Hash).</param>
    /// <returns>True if the password matches the hash, False otherwise.</returns>
    public static Boolean Verify(String password, String hashedPassword) {
        String[] parts = hashedPassword.Split(Separator);
        if (parts.Length != 3) {
            throw new FormatException("The stored password hash is not in the correct format.");
        }

        Int32 iterations = Int32.Parse(parts[0]);
        Byte[] salt = Convert.FromBase64String(parts[1]);
        Byte[] key = Convert.FromBase64String(parts[2]);

        using var algorithm = new Rfc2898DeriveBytes(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256
        );
        Byte[] keyCheck = algorithm.GetBytes(KeySize);

        return CryptographicOperations.FixedTimeEquals(key, keyCheck);
    }
}
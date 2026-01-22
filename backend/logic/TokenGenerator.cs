using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace logic {
    internal class TokenGenerator {
        /// <summary>
        /// Generates a cryptographically secure Base64 token of a specified length.
        /// </summary>
        /// <param name="dataLengthBytes">The length, in bytes, of the random data to generate.</param>
        /// <returns>A Base64-encoded token string. The final string length will be roughly (4/3) * dataLengthBytes.</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown if dataLengthBytes is less than or equal to zero.</exception>
        public static string GenerateRandomBase64Token(uint dataLengthBytes) {
            if (dataLengthBytes <= 0) {
                throw new ArgumentOutOfRangeException(nameof(dataLengthBytes), "The data length must be greater than zero.");
            }

            byte[] randomBytes = new byte[dataLengthBytes];

            RandomNumberGenerator.Fill(randomBytes);

            return Convert.ToBase64String(randomBytes);
        }
    }
}

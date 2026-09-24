using Microsoft.AspNetCore.Identity;

namespace database.Identity;

public sealed class ApplicationIdentityUser : IdentityUser {
    public UInt64 LegacyUserId { get; set; }
}

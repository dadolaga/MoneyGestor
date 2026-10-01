using System.ComponentModel.DataAnnotations;

namespace webserver.Auth;

public sealed record RegisterAccountRequest(
    [Required, StringLength(100)] String Firstname,
    [Required, StringLength(100)] String Lastname,
    [Required, StringLength(64, MinimumLength = 3)] String Username,
    [Required, EmailAddress, StringLength(256)] String Email,
    [Required, StringLength(128, MinimumLength = 12)] String Password);

public sealed record LoginAccountRequest(
    [Required, StringLength(256)] String User,
    [Required, StringLength(128)] String Password,
    Boolean Remember = false);

public sealed record EmailAccountRequest(
    [Required, EmailAddress, StringLength(256)] String Email);

public sealed record ConfirmEmailRequest(
    [Required, StringLength(128)] String UserId,
    [Required, StringLength(4096)] String Token);

public sealed record ResetPasswordRequest(
    [Required, EmailAddress, StringLength(256)] String Email,
    [Required, StringLength(4096)] String Token,
    [Required, StringLength(128, MinimumLength = 12)] String Password);

public sealed record AccountProfile(
    UInt64 Id,
    String Firstname,
    String Lastname,
    String Email,
    String Username);

public enum AccountLoginStatus {
    Succeeded,
    Invalid,
    LockedOut,
    EmailNotConfirmed
}
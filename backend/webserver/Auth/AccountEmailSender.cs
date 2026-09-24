using System.Net;
using System.Net.Mail;

namespace webserver.Auth;

public interface IAccountEmailSender {
    Task SendConfirmationAsync(String destination, String link, CancellationToken cancellationToken);
    Task SendPasswordResetAsync(String destination, String link, CancellationToken cancellationToken);
}

public sealed class SmtpAccountEmailSender : IAccountEmailSender {
    public Task SendConfirmationAsync(String destination, String link, CancellationToken cancellationToken) =>
        SendAsync(destination, "Confirm your MoneyGestor account", $"Confirm your account: {link}", cancellationToken);

    public Task SendPasswordResetAsync(String destination, String link, CancellationToken cancellationToken) =>
        SendAsync(destination, "Reset your MoneyGestor password", $"Reset your password: {link}", cancellationToken);

    private static async Task SendAsync(
        String destination,
        String subject,
        String body,
        CancellationToken cancellationToken) {
        if (!Settings.Email.IsConfigured) {
            throw new InvalidOperationException("Email delivery is not configured.");
        }

        using var message = new MailMessage(Settings.Email.From!, destination, subject, body);
        using var client = new SmtpClient(Settings.Email.Host!, Settings.Email.Port) {
            EnableSsl = Settings.Email.UseSsl
        };
        if (!String.IsNullOrWhiteSpace(Settings.Email.Username)) {
            client.Credentials = new NetworkCredential(Settings.Email.Username, Settings.Email.Password);
        }

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, cancellationToken);
    }
}

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace webserver.Auth;

public interface IAccountEmailSender {
    Task SendConfirmationAsync(String destination, String link, CancellationToken cancellationToken);
    Task SendPasswordResetAsync(String destination, String link, CancellationToken cancellationToken);
}

public sealed class SmtpAccountEmailSender(IOptions<EmailOptions> configuredOptions) : IAccountEmailSender {
    private readonly EmailOptions options = configuredOptions.Value;

    public Task SendConfirmationAsync(String destination, String link, CancellationToken cancellationToken) =>
        SendAsync(destination, "Confirm your MoneyGestor account", $"Confirm your account: {link}", cancellationToken);

    public Task SendPasswordResetAsync(String destination, String link, CancellationToken cancellationToken) =>
        SendAsync(destination, "Reset your MoneyGestor password", $"Reset your password: {link}", cancellationToken);

    private async Task SendAsync(
        String destination,
        String subject,
        String body,
        CancellationToken cancellationToken) {
        if (!options.IsConfigured) {
            throw new InvalidOperationException("Email delivery is not configured.");
        }

        using var message = new MailMessage(options.From!, destination, subject, body);
        using var client = new SmtpClient(options.Host!, options.Port) {
            EnableSsl = options.UseSsl
        };
        if (!String.IsNullOrWhiteSpace(options.Username)) {
            client.Credentials = new NetworkCredential(options.Username, options.Password);
        }

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, cancellationToken);
    }
}

using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace webserver.Api.V1;

public sealed class TransactionCsvResult(IAsyncEnumerable<TransactionResponse> rows, TransactionPeriod period, String locale) : IActionResult {
    public async Task ExecuteResultAsync(ActionContext context) {
        var response = context.HttpContext.Response;
        var cancellationToken = context.HttpContext.RequestAborted;
        response.ContentType = "text/csv; charset=utf-8";
        response.Headers.ContentDisposition = $"attachment; filename=flowiy-{period.From:yyyy-MM-dd}-{period.To:yyyy-MM-dd}.csv";
        await using var writer = new StreamWriter(response.Body, new UTF8Encoding(true), 4096, leaveOpen: true);
        var italian = locale == "it";
        var headers = italian ? new[] { "Data", "Descrizione", "Tipo movimento", "Categoria", "Portafoglio", "Destinazione", "Importo" }
            : new[] { "Date", "Description", "Movement type", "Category", "Wallet", "Destination", "Amount" };
        await writer.WriteAsync((String.Join(';', headers.Select(Escape)) + "\r\n").AsMemory(), cancellationToken);
        await foreach (var row in rows.WithCancellation(cancellationToken)) {
            var kind = row.Type.SystemKind == "Transfer" ? (italian ? "Trasferimento" : "Transfer")
                : row.Value > 0 ? (italian ? "Entrata" : "Income") : (italian ? "Uscita" : "Expense");
            var text = new[] { row.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), row.Description ?? "", kind,
                row.Type.Name, row.Wallet.Name, row.Destination?.Name ?? "" };
            var line = String.Join(';', text.Select(Escape)) + ";" + row.Value.ToString("0.00", CultureInfo.InvariantCulture) + "\r\n";
            await writer.WriteAsync(line.AsMemory(), cancellationToken);
        }
        await writer.FlushAsync(cancellationToken);
    }

    private static String Escape(String value) {
        var trimmed = value.TrimStart();
        if (trimmed.Length > 0 && "=+-@".Contains(trimmed[0]) || value.Any(character => character is '\t' or '\r' or '\n')) value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}

using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using MySql.Data.MySqlClient;

namespace webserver;

internal sealed class DatabaseReadinessHealthCheck(
    IOptions<DatabaseOptions> databaseOptions,
    IOptions<ObservabilityOptions> observabilityOptions,
    ObservabilityMetrics metrics,
    ILogger<DatabaseReadinessHealthCheck> logger) : IHealthCheck {
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default) {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(observabilityOptions.Value.DatabaseReadinessTimeoutSeconds));
        try {
            await using var connection = new MySqlConnection(databaseOptions.Value.CreateConnectionString());
            await connection.OpenAsync(timeout.Token);
            await using var command = new MySqlCommand("SELECT 1", connection);
            _ = await command.ExecuteScalarAsync(timeout.Token);
            return HealthCheckResult.Healthy();
        } catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) {
            throw;
        } catch (Exception exception) {
            metrics.RecordDatabaseFailure();
            logger.LogWarning(new EventId(1201, "DatabaseReadinessFailed"),
                "Database readiness check failed ({ExceptionType})", exception.GetType().Name);
            return HealthCheckResult.Unhealthy("Database unavailable");
        }
    }
}

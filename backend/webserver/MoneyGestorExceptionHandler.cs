using logic.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using webserver.Controllers;

namespace webserver {
    public sealed class MoneyGestorExceptionHandler(ILogger<MoneyGestorExceptionHandler> logger, ObservabilityMetrics metrics) : IExceptionHandler {
        public async ValueTask<Boolean> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken) {
            if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested) {
                return true;
            }

            var isV1 = context.Request.Path.StartsWithSegments("/api/v1");
            if (!isV1) {
                var (legacy, legacyStatus) = exception switch {
                    TokenExpiredException => (new BaseResponse { Code = 20, Message = "User token expiated" }, 403),
                    ObjectNotFoundException or UserPermissionException => (new BaseResponse { Code = 404, Message = "Resource not found" }, 404),
                    ListFilterValidationException or WalletValidationException or MandatoryParamException => (new BaseResponse { Code = 10, Message = "Invalid request" }, 400),
                    InvalidTransactionException => (new BaseResponse { Code = 302, Message = "Invalid transaction" }, 400),
                    NotValidForDeleteException => (new BaseResponse { Code = 202, Message = "Resource cannot be deleted" }, 409),
                    _ => (new BaseResponse { Code = 500, Message = "Unexpected error" }, 500)
                };
                if (legacyStatus == 500) {
                    logger.LogError(exception, "Unhandled legacy API error ({TraceId})", context.TraceIdentifier);
                }

                context.Response.StatusCode = legacyStatus;
                await context.Response.WriteAsJsonAsync(legacy, cancellationToken: cancellationToken);
                return true;
            }

            var (status, code, title, errors) = exception switch {
                WalletValidationException wallet => (400, "validation_failed", "Request validation failed",
                    new Dictionary<String, String[]> { [wallet.Field] = [wallet.Reason] }),
                ListFilterValidationException filter => (400, "validation_failed", "Request validation failed",
                    new Dictionary<String, String[]> { [filter.Field] = [filter.Reason] }),
                MandatoryParamException => (400, "validation_failed", "Request validation failed", (IDictionary<String, String[]>?) null),
                ObjectNotFoundException or UserPermissionException => (404, "resource_not_found", "Resource not found", null),
                DuplicateObjectException or NotValidForDeleteException => (409, "resource_conflict", "Resource conflict", null),
                InvalidTransactionException => (422, "domain_rule_violated", "Domain rule violated", null),
                UnauthorizedAccessException => (401, "authentication_required", "Authentication required", null),
                _ => (500, "unexpected_error", "An unexpected error occurred", null)
            };
            if (status == 500) {
                if (exception.GetBaseException() is DbException or DbUpdateException) {
                    metrics.RecordDatabaseFailure();
                }

                logger.LogError(exception, "Unhandled API error ({TraceId})", context.TraceIdentifier);
            }

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/problem+json";
            var problem = new ProblemDetails {
                Type = $"https://api.moneygestor.example/problems/{code}",
                Title = title,
                Status = status
            };
            problem.Extensions["code"] = code;
            problem.Extensions["traceId"] = context.TraceIdentifier;
            if (errors != null) {
                problem.Extensions["errors"] = errors;
            }

            await context.Response.WriteAsJsonAsync(problem, cancellationToken: cancellationToken);
            return true;
        }
    }
}

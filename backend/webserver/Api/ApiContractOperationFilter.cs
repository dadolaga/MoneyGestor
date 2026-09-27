using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace webserver.Api;

public sealed class ApiContractOperationFilter : IOperationFilter {
    private const String CookieScheme = "MoneyGestorCookie";
    private const String AntiforgeryScheme = "AntiforgeryHeader";
    private static readonly Int32[] ProblemStatuses = [400, 401, 403, 404, 409, 422, 423, 429, 500];

    public void Apply(OpenApiOperation operation, OperationFilterContext context) {
        var path = context.ApiDescription.RelativePath ?? String.Empty;
        if (!path.StartsWith("api/v1/", StringComparison.OrdinalIgnoreCase)) {
            operation.Deprecated = true;
            var usesLegacyToken = context.ApiDescription.ParameterDescriptions.Any(parameter =>
                parameter.Name.Equals("authorization", StringComparison.OrdinalIgnoreCase));
            if (usesLegacyToken) {
                operation.Security = [new OpenApiSecurityRequirement {
                    [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "LegacyRawToken" } }] = Array.Empty<String>()
                }];
            }
            return;
        }

        var endpointMetadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        var anonymous = endpointMetadata.OfType<IAllowAnonymous>().Any();
        var explicitlyAuthorized = endpointMetadata.OfType<IAuthorizeData>().Any();
        var antiforgeryEndpoint = path.Equals("api/v1/auth/antiforgery", StringComparison.OrdinalIgnoreCase);
        var protectedOperation = !anonymous && (explicitlyAuthorized || !antiforgeryEndpoint);
        var requirement = new OpenApiSecurityRequirement();
        if (protectedOperation) {
            requirement[new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = CookieScheme } }] = Array.Empty<String>();
        }
        var unsafeMethod = context.ApiDescription.HttpMethod is "POST" or "PUT" or "PATCH" or "DELETE";
        if (unsafeMethod) {
            requirement[new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = AntiforgeryScheme } }] = Array.Empty<String>();
        }
        if (requirement.Count > 0) operation.Security = [requirement];

        foreach (var status in ProblemStatuses) {
            var key = status.ToString(System.Globalization.CultureInfo.InvariantCulture);
            if (operation.Responses.ContainsKey(key)) continue;
            operation.Responses[key] = new OpenApiResponse {
                Description = status switch {
                    400 => "Request validation or antiforgery failed",
                    401 => "Authentication required or credentials invalid",
                    403 => "Operation forbidden",
                    404 => "Resource not found",
                    409 => "Resource conflict",
                    422 => "Domain rule violated",
                    423 => "Account locked",
                    429 => "Rate limit exceeded",
                    _ => "Unexpected error"
                },
                Content = new Dictionary<String, OpenApiMediaType> {
                    ["application/problem+json"] = new() { Schema = ProblemSchema() }
                }
            };
        }
    }

    private static OpenApiSchema ProblemSchema() => new() {
        Type = "object",
        Required = new HashSet<String> { "title", "status", "code", "traceId" },
        Properties = new Dictionary<String, OpenApiSchema> {
            ["type"] = new() { Type = "string", Format = "uri" },
            ["title"] = new() { Type = "string" },
            ["status"] = new() { Type = "integer", Format = "int32" },
            ["code"] = new() { Type = "string" },
            ["traceId"] = new() { Type = "string" },
            ["errors"] = new() { Type = "object", AdditionalProperties = new OpenApiSchema { Type = "array", Items = new OpenApiSchema { Type = "string" } } }
        }
    };
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace webserver.Api;

public sealed class ApiContractOperationFilter : IOperationFilter {
    private const String CookieScheme = "MoneyGestorCookie";
    private const String AntiforgeryScheme = "AntiforgeryHeader";
    private static readonly Int32[] ProblemStatuses = [400, 401, 403, 404, 409, 422, 423, 429, 500];

    public void Apply(OpenApiOperation operation, OperationFilterContext context) {
        var path = context.ApiDescription.RelativePath ?? String.Empty;
        var endpointMetadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;
        var anonymous = endpointMetadata.OfType<IAllowAnonymous>().Any();
        var explicitlyAuthorized = endpointMetadata.OfType<IAuthorizeData>().Any();
        var antiforgeryEndpoint = path.Equals("api/v1/auth/antiforgery", StringComparison.OrdinalIgnoreCase);
        var protectedOperation = !anonymous && (explicitlyAuthorized || !antiforgeryEndpoint);
        var requirement = new OpenApiSecurityRequirement();
        if (protectedOperation) {
            requirement[new OpenApiSecuritySchemeReference(CookieScheme, context.Document)] = [];
        }

        var unsafeMethod = context.ApiDescription.HttpMethod is "POST" or "PUT" or "PATCH" or "DELETE";
        if (unsafeMethod) {
            requirement[new OpenApiSecuritySchemeReference(AntiforgeryScheme, context.Document)] = [];
        }

        if (requirement.Count > 0) {
            operation.Security = [requirement];
        }

        operation.Responses ??= new OpenApiResponses();
        foreach (var status in ProblemStatuses) {
            var key = status.ToString(System.Globalization.CultureInfo.InvariantCulture);
            if (operation.Responses.ContainsKey(key)) {
                continue;
            }

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
        Type = JsonSchemaType.Object,
        Required = new HashSet<String> { "title", "status", "code", "traceId" },
        Properties = new Dictionary<String, IOpenApiSchema> {
            ["type"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uri" },
            ["title"] = new OpenApiSchema { Type = JsonSchemaType.String },
            ["status"] = new OpenApiSchema { Type = JsonSchemaType.Integer, Format = "int32" },
            ["code"] = new OpenApiSchema { Type = JsonSchemaType.String },
            ["traceId"] = new OpenApiSchema { Type = JsonSchemaType.String },
            ["errors"] = new OpenApiSchema {
                Type = JsonSchemaType.Object,
                AdditionalProperties = new OpenApiSchema {
                    Type = JsonSchemaType.Array,
                    Items = new OpenApiSchema { Type = JsonSchemaType.String }
                }
            }
        }
    };
}

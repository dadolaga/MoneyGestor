using database;
using database.Identity;
using logic;
using logic.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Serilog;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using webserver.Api;
using webserver.Api.V1;
using webserver.Auth;

namespace webserver;

public class Program {
    public static async Task<Int32> Main(String[] args) {
        if (args.Length > 0 && args[0] == "--healthcheck") {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            try {
                using var response = await client.GetAsync("http://127.0.0.1:8080/health/ready");
                return response.IsSuccessStatusCode ? 0 : 1;
            } catch {
                return 1;
            }
        }

        if (args.Length > 0 && args[0] == "--export-openapi") {
            var output = args.Length > 1 ? args[1] : "docs/openapi";
            var exportApplication = BuildApplication(Array.Empty<String>());
            try {
                exportApplication.Urls.Add("http://127.0.0.1:0");
                await exportApplication.StartAsync();
                OpenApiSnapshotWriter.Write(
                    exportApplication.Services.GetRequiredService<Swashbuckle.AspNetCore.Swagger.ISwaggerProvider>(),
                    ResolveOpenApiOutputDirectory(output));
            } finally {
                await exportApplication.StopAsync();
                await exportApplication.DisposeAsync();
            }

            return 0;
        }

        var app = BuildApplication(args);
        await InitializeApplicationAsync(app);
        await app.RunAsync();
        return 0;
    }

    private static String ResolveOpenApiOutputDirectory(String output) {
        if (Path.IsPathRooted(output)) {
            return Path.GetFullPath(output);
        }

        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent) {
            if (File.Exists(Path.Combine(directory.FullName, "backend.sln"))) {
                return Path.GetFullPath(output, directory.Parent!.FullName);
            }
        }

        return Path.GetFullPath(output, Directory.GetCurrentDirectory());
    }

    public static WebApplication BuildApplication(String[] args) {
        var builder = WebApplication.CreateBuilder(args);
        var isTesting = builder.Environment.IsEnvironment("Testing");

        if (isTesting) {
            builder.Configuration.AddInMemoryCollection(new Dictionary<String, String?> {
                ["database:host"] = "127.0.0.1",
                ["database:port"] = "3306",
                ["database:name"] = "unused_openapi_export",
                ["database:user"] = "unused",
                ["database:password"] = "unused",
                ["database:bootstrapMode"] = "Disabled",
                ["log:level"] = "Information",
                ["log:output:console"] = "true",
                ["security:allowedOrigins:0"] = "http://localhost:3000",
                ["email:port"] = "587",
                ["email:frontendBaseUrl"] = "http://localhost:3000"
            });
        }

        if (!isTesting) {
            AddApplicationSettings(builder);
            var logOptions = builder.Configuration
                .GetRequiredSection(LogOptions.SectionName)
                .Get<LogOptions>() ?? throw new InvalidOperationException("Log configuration is missing.");
            if (!LogOptions.IsValid(logOptions)) {
                throw new InvalidOperationException("Log configuration is invalid.");
            }

            Log.Logger = LoggerFactory.Create(logOptions);
            builder.Host.UseSerilog();
            Log.ForContext("EventId", 1000)
                .ForContext("EventName", "ApplicationConfigured")
                .Information("MoneyGestor API configured ({Version})", "0.0.1-alpha");
        }

        AddValidatedOptions(builder.Services, builder.Configuration);
        builder.Services.AddSingleton<ObservabilityMetrics>();
        builder.Services.AddSingleton<AuthFailureAggregator>();
        builder.Services.AddHostedService(provider => provider.GetRequiredService<AuthFailureAggregator>());
        builder.Services.AddHealthChecks()
            .AddCheck<DatabaseReadinessHealthCheck>("database", tags: ["ready"]);
        AddDatabaseServices(builder.Services, builder.Environment);

        builder.Services.AddControllers().ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = context => {
            var problem = new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(context.ModelState) {
                Type = "https://api.moneygestor.example/problems/validation-failed",
                Title = "Request validation failed",
                Status = StatusCodes.Status400BadRequest
            };
            problem.Extensions["code"] = "validation_failed";
            problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(problem) {
                ContentTypes = { "application/problem+json" }
            };
        });
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options => {
            options.SupportNonNullableReferenceTypes();
            options.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo {
                Title = "MoneyGestor API",
                Version = "v1",
                Description = "Cookie-authenticated API. Unsafe requests require the antiforgery header."
            });
            options.DocInclusionPredicate((document, description) => document == "v1"
                && description.RelativePath?.StartsWith("api/v1/", StringComparison.OrdinalIgnoreCase) == true);
            options.AddSecurityDefinition("MoneyGestorCookie", new Microsoft.OpenApi.OpenApiSecurityScheme {
                Type = Microsoft.OpenApi.SecuritySchemeType.ApiKey,
                In = Microsoft.OpenApi.ParameterLocation.Cookie,
                Name = "MoneyGestor.Auth",
                Description = "Identity session cookie; issued by /api/v1/auth/login."
            });
            options.AddSecurityDefinition("AntiforgeryHeader", new Microsoft.OpenApi.OpenApiSecurityScheme {
                Type = Microsoft.OpenApi.SecuritySchemeType.ApiKey,
                In = Microsoft.OpenApi.ParameterLocation.Header,
                Name = "X-CSRF-TOKEN",
                Description = "Request token from GET /api/v1/auth/antiforgery."
            });
            options.OperationFilter<ApiContractOperationFilter>();
            options.SchemaFilter<ApiDtoSchemaFilter>();
        });
        builder.Services.AddCors(options => options.AddPolicy("CorsPolicy", policy => {
            var security = builder.Configuration
                .GetRequiredSection(SecurityOptions.SectionName)
                .Get<SecurityOptions>() ?? throw new InvalidOperationException("Security configuration is missing.");
            policy
                .WithOrigins(security.AllowedOrigins)
                .AllowCredentials()
                .AllowAnyHeader()
                .WithExposedHeaders("Content-Disposition")
                .AllowAnyMethod();
        }));

        var dataProtection = builder.Services.AddDataProtection().SetApplicationName("MoneyGestor");
        if (!isTesting) {
            var configuredKeyPath = Environment.GetEnvironmentVariable("DATA_PROTECTION_KEYS_PATH");
            if (builder.Environment.IsProduction() && String.IsNullOrWhiteSpace(configuredKeyPath)) {
                throw new InvalidOperationException(
                    "DATA_PROTECTION_KEYS_PATH must reference persistent protected storage in Production.");
            }

            var keyPath = String.IsNullOrWhiteSpace(configuredKeyPath)
                ? Path.Combine(AppContext.BaseDirectory, "data-protection-keys")
                : configuredKeyPath;
            Directory.CreateDirectory(keyPath);
            dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));
        }

        builder.Services
            .AddIdentity<ApplicationIdentityUser, IdentityRole<UInt64>>(options => {
                options.Password.RequiredLength = 12;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.AllowedForNewUsers = true;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<MoneyGestorContext>()
            .AddDefaultTokenProviders();
        builder.Services.AddOptions<IdentityOptions>()
            .Configure<IOptions<SecurityOptions>>((options, security) =>
                options.SignIn.RequireConfirmedEmail = security.Value.RequireConfirmedEmail);
        builder.Services.AddScoped<AccountService>();
        builder.Services.AddScoped<IApiCurrentUser, ApiCurrentUser>();
        builder.Services.AddScoped<IResourceQueryService, ResourceQueryService>();
        builder.Services.AddScoped<DatabaseBootstrapper>();
        builder.Services.AddScoped<DatabaseInitializer>();
        builder.Services.AddScoped<ExecutorManager>();
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<AccountAbuseGuard>();
        builder.Services.AddScoped<IAccountEmailSender, SmtpAccountEmailSender>();
        builder.Services.ConfigureApplicationCookie(options => {
            options.Cookie.Name = "MoneyGestor.Auth";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = builder.Environment.IsProduction()
                ? CookieSecurePolicy.Always
                : CookieSecurePolicy.SameAsRequest;
            options.ExpireTimeSpan = TimeSpan.FromHours(2);
            options.SlidingExpiration = true;
            options.Events.OnValidatePrincipal = async context => {
                var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationIdentityUser>>();
                var userId = context.Principal == null ? null : users.GetUserId(context.Principal);
                // Reject incompatible sessions before Identity converts the claim to a numeric store key.
                if (!UInt64.TryParse(userId, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id == 0) {
                    context.RejectPrincipal();
                    await context.HttpContext.SignOutAsync(context.Scheme.Name);
                    return;
                }

                await SecurityStampValidator.ValidatePrincipalAsync(context);
            };
            options.Events.OnRedirectToLogin = context => {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context => {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });
        builder.Services.Configure<SecurityStampValidatorOptions>(options =>
            options.ValidationInterval = TimeSpan.Zero);
        builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
            options.TokenLifespan = TimeSpan.FromHours(1));
        builder.Services.AddAntiforgery(options => {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "MoneyGestor.Antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = builder.Environment.IsProduction()
                ? CookieSecurePolicy.Always
                : CookieSecurePolicy.SameAsRequest;
        });

        builder.Services.AddExceptionHandler<MoneyGestorExceptionHandler>();
        builder.Services.AddProblemDetails();

        var app = builder.Build();

        app.UseMiddleware<RequestCorrelationMiddleware>();
        if (!isTesting) {
            app.UseSerilogRequestLogging(options => {
                options.MessageTemplate = "HTTP request {RequestMethod} {RequestPath} completed with status {StatusCode} in {Elapsed:0.0000} ms";
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) => {
                    diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
                    diagnosticContext.Set("CorrelationId", httpContext.Items["CorrelationId"]?.ToString() ?? String.Empty);
                    if (httpContext.Items["ExternalCorrelationId"] is String externalId) {
                        diagnosticContext.Set("ExternalCorrelationId", externalId);
                    }
                };
            });
        }

        app.UseMiddleware<ObservabilityMetricsMiddleware>();
        app.UseExceptionHandler();
        if (app.Environment.IsDevelopment() || isTesting) {
            app.UseSwagger();
            app.UseSwaggerUI(options => {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "MoneyGestor API v1");
            });
        }

        app.UseHttpsRedirection();
        app.UseRouting();
        app.UseCors("CorsPolicy");
        app.UseAuthentication();
        app.Use(async (context, next) => {
            if (context.Request.Path.StartsWithSegments("/api/v1")
                && context.GetEndpoint() != null
                && context.GetEndpoint()?.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() == null
                && context.User.Identity?.IsAuthenticated != true) {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/problem+json";
                var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails {
                    Type = "https://api.moneygestor.example/problems/authentication-required",
                    Title = "Authentication required",
                    Status = StatusCodes.Status401Unauthorized,
                    Extensions = { ["code"] = "authentication_required", ["traceId"] = context.TraceIdentifier }
                };
                await context.Response.WriteAsync(
                    JsonSerializer.Serialize(problem, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
                    context.RequestAborted);
                return;
            }

            await next(context);
        });
        app.UseAuthorization();
        // Antiforgery request tokens are bound to the authenticated identity.
        app.Use(async (context, next) => {
            var requiresAntiforgery = context.Request.Path.StartsWithSegments("/api/v1") && (
                HttpMethods.IsPost(context.Request.Method) ||
                HttpMethods.IsPut(context.Request.Method) ||
                HttpMethods.IsPatch(context.Request.Method) ||
                HttpMethods.IsDelete(context.Request.Method));
            if (requiresAntiforgery) {
                try {
                    await context.RequestServices
                        .GetRequiredService<Microsoft.AspNetCore.Antiforgery.IAntiforgery>()
                        .ValidateRequestAsync(context);
                } catch (Microsoft.AspNetCore.Antiforgery.AntiforgeryValidationException) {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = "application/problem+json";
                    var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails {
                        Type = "https://api.moneygestor.example/problems/antiforgery-validation-failed",
                        Status = StatusCodes.Status400BadRequest,
                        Title = "Invalid antiforgery token"
                    };
                    problem.Extensions["code"] = "antiforgery_validation_failed";
                    problem.Extensions["traceId"] = context.TraceIdentifier;
                    await context.Response.WriteAsync(
                        JsonSerializer.Serialize(problem, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
                        context.RequestAborted);
                    return;
                }
            }

            await next(context);
        });
        app.MapControllers();

        app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions {
            Predicate = _ => false,
            ResponseWriter = WriteHealthResponse
        });
        app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions {
            Predicate = check => check.Tags.Contains("ready"),
            ResponseWriter = WriteHealthResponse
        });
        var observability = app.Services.GetRequiredService<IOptions<ObservabilityOptions>>().Value;
        if (observability.MetricsEnabled) {
            app.MapGet(observability.MetricsPath, (ObservabilityMetrics metrics, HttpContext context) => {
                context.Response.Headers.CacheControl = "no-store";
                return Results.Text(metrics.RenderPrometheus(), "text/plain; version=0.0.4; charset=utf-8");
            });
        }

        var appLogger = app.Services.GetRequiredService<ILogger<Program>>();
        app.Lifetime.ApplicationStarted.Register(() =>
            appLogger.LogInformation(new EventId(1001, "ApplicationStarted"), "MoneyGestor API started"));
        app.Lifetime.ApplicationStopping.Register(() =>
            appLogger.LogInformation(new EventId(1002, "ApplicationStopping"), "MoneyGestor API stopping"));

        return app;
    }

    internal static async Task InitializeApplicationAsync(
        WebApplication app,
        CancellationToken cancellationToken = default) {
        await using var scope = app.Services.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var databaseOptions = services.GetRequiredService<IOptions<DatabaseOptions>>().Value;
        var emailOptions = services.GetRequiredService<IOptions<EmailOptions>>().Value;

        var securityOptions = services.GetRequiredService<IOptions<SecurityOptions>>().Value;
        if (app.Environment.IsProduction() && securityOptions.RequireConfirmedEmail && !emailOptions.IsConfigured) {
            throw new InvalidOperationException("Email delivery must be configured in Production when email confirmation is required.");
        }

        var logger = services.GetRequiredService<ILogger<Program>>();
        var bootstrapStarted = Stopwatch.GetTimestamp();
        logger.LogInformation(new EventId(1100, "DatabaseBootstrapStarted"),
            "Database bootstrap started ({BootstrapMode})", databaseOptions.BootstrapMode);
        var moneyGestorDatabase = services.GetRequiredService<MoneyGestorContext>();
        var bootstrapOutcome = await services.GetRequiredService<DatabaseBootstrapper>()
            .BootstrapAsync(databaseOptions.BootstrapMode, cancellationToken);

        await services.GetRequiredService<DatabaseInitializer>().InitAsync(cancellationToken);
        try {
            await DataIntegrityPreflight.EnsureValidAsync(moneyGestorDatabase, cancellationToken);
        } catch (logic.Exceptions.DataIntegrityException exception) {
            logger.LogCritical(new EventId(1102, "DataIntegrityMismatch"),
                "Data integrity preflight detected {IssueCount} issue groups", exception.Report.Issues.Count);
            throw;
        }

        logger.LogInformation(new EventId(1101, "DatabaseBootstrapCompleted"),
            "Database bootstrap completed ({BootstrapOutcome}) in {ElapsedMilliseconds} ms",
            bootstrapOutcome, Stopwatch.GetElapsedTime(bootstrapStarted).TotalMilliseconds);
    }

    internal static Boolean ShouldEnableDatabaseLogging(
        Boolean isDevelopment,
        Serilog.Events.LogEventLevel configuredLevel) =>
        isDevelopment && configuredLevel == Serilog.Events.LogEventLevel.Verbose;

    private static Task WriteHealthResponse(HttpContext context, Microsoft.Extensions.Diagnostics.HealthChecks.HealthReport report) {
        context.Response.Headers.CacheControl = "no-store";
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(new { status = report.Status.ToString() }));
    }

    private static void AddApplicationSettings(WebApplicationBuilder builder) {
        var path = Environment.GetEnvironmentVariable("BACKEND_APP_SETTINGS") ?? "./settings.json";
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath)) {
            throw new FileNotFoundException("The backend settings file does not exist.", fullPath);
        }

        builder.Configuration
            .AddJsonFile(fullPath, optional: false, reloadOnChange: true)
            .AddEnvironmentVariables();
    }

    private static void AddValidatedOptions(IServiceCollection services, IConfiguration configuration) {
        services.AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .Validate(DatabaseOptions.IsValid,
                "Database host, port, name, user and password are required; bootstrapMode must be valid.")
            .ValidateOnStart();
        services.AddOptions<LogOptions>()
            .Bind(configuration.GetSection(LogOptions.SectionName))
            .Validate(LogOptions.IsValid, "Log level and file output configuration must be valid.")
            .ValidateOnStart();
        services.AddOptions<SecurityOptions>()
            .Bind(configuration.GetSection(SecurityOptions.SectionName))
            .Validate(SecurityOptions.IsValid, "At least one absolute allowed origin is required.")
            .ValidateOnStart();
        services.AddOptions<EmailOptions>()
            .Bind(configuration.GetSection(EmailOptions.SectionName))
            .Validate(EmailOptions.IsValid, "When SMTP is configured, email.port must be between 1 and 65535 and email.frontendBaseUrl must be an absolute URL.")
            .ValidateOnStart();
        services.AddOptions<ObservabilityOptions>()
            .Bind(configuration.GetSection(ObservabilityOptions.SectionName))
            .Validate(ObservabilityOptions.IsValid, "Observability configuration is invalid.")
            .ValidateOnStart();
    }

    private static void AddDatabaseServices(IServiceCollection services, IWebHostEnvironment environment) {
        services.AddDbContextFactory<MoneyGestorContext>((serviceProvider, options) => {
            var database = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            var logging = serviceProvider.GetRequiredService<IOptions<LogOptions>>().Value;
            options.UseMySQL(database.CreateConnectionString());
            if (logging.DiagnosticEfLogging && ShouldEnableDatabaseLogging(environment.IsDevelopment(), logging.GetLevel())) {
                options.LogTo(Log.Verbose, Microsoft.Extensions.Logging.LogLevel.Debug);
            }
        });
        services.AddScoped(services =>
            services.GetRequiredService<IDbContextFactory<MoneyGestorContext>>().CreateDbContext());
    }
}

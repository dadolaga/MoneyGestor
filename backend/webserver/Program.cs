using database;
using database.Identity;
using logic;
using logic.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json;
using Serilog;
using webserver.Auth;
using webserver.Api.V1;
using webserver.Api;

namespace webserver;

public class Program {
    public static async Task Main(String[] args) {
        if (args.Length > 0 && args[0] == "--export-openapi") {
            var output = args.Length > 1 ? args[1] : "docs/openapi";
            var exportApplication = BuildApplication(Array.Empty<String>());
            OpenApiSnapshotWriter.Write(
                exportApplication.Services.GetRequiredService<Swashbuckle.AspNetCore.Swagger.ISwaggerProvider>(),
                ResolveOpenApiOutputDirectory(output));
            await exportApplication.DisposeAsync();
            return;
        }
        var app = BuildApplication(args);
        await InitializeApplicationAsync(app);
        await app.RunAsync();
    }

    private static String ResolveOpenApiOutputDirectory(String output) {
        if (Path.IsPathRooted(output)) return Path.GetFullPath(output);
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory != null; directory = directory.Parent) {
            if (File.Exists(Path.Combine(directory.FullName, "backend.sln")))
                return Path.GetFullPath(output, directory.Parent!.FullName);
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
                ["log:output:console"] = "false",
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
            Log.Information("Start application with version {Version}", "0.0.1-alpha");
        }

        AddValidatedOptions(builder.Services, builder.Configuration);
        AddDatabaseServices(builder.Services, builder.Environment);

        builder.Services.AddControllers().ConfigureApiBehaviorOptions(options => {
            options.InvalidModelStateResponseFactory = context => {
                if (!context.HttpContext.Request.Path.StartsWithSegments("/api/v1"))
                    return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(context.ModelState));
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
            };
        });
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options => {
            options.SupportNonNullableReferenceTypes();
            options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo {
                Title = "MoneyGestor API",
                Version = "v1",
                Description = "Cookie-authenticated API. Unsafe requests require the antiforgery header."
            });
            options.SwaggerDoc("legacy", new Microsoft.OpenApi.Models.OpenApiInfo {
                Title = "MoneyGestor Legacy API",
                Version = "legacy",
                Description = "Deprecated compatibility contract. The raw Authorization token is temporary."
            });
            options.DocInclusionPredicate((document, description) => {
                var isV1 = description.RelativePath?.StartsWith("api/v1/", StringComparison.OrdinalIgnoreCase) == true;
                return document == "v1" ? isV1 : document == "legacy" && !isV1;
            });
            options.AddSecurityDefinition("MoneyGestorCookie", new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                In = Microsoft.OpenApi.Models.ParameterLocation.Cookie,
                Name = "MoneyGestor.Auth",
                Description = "Identity session cookie; issued by /api/v1/auth/login."
            });
            options.AddSecurityDefinition("AntiforgeryHeader", new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                Name = "X-CSRF-TOKEN",
                Description = "Request token from GET /api/v1/auth/antiforgery."
            });
            options.AddSecurityDefinition("LegacyRawToken", new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                Name = "Authorization",
                Description = "Deprecated raw token accepted only on legacy endpoints."
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
            .AddIdentity<ApplicationIdentityUser, IdentityRole>(options => {
                options.SignIn.RequireConfirmedEmail = true;
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
            .AddEntityFrameworkStores<IdentityAccountContext>()
            .AddDefaultTokenProviders();
        builder.Services.AddScoped<IPasswordHasher<ApplicationIdentityUser>, LegacyCompatiblePasswordHasher>();
        builder.Services.AddScoped<AccountService>();
        builder.Services.AddScoped<IApiCurrentUser, ApiCurrentUser>();
        builder.Services.AddScoped<IResourceQueryService, ResourceQueryService>();
        builder.Services.AddScoped<IResourceCommandService, ResourceCommandService>();
        builder.Services.AddScoped<LegacyIdentityBootstrapper>();
        builder.Services.AddScoped<LegacyDatabaseBootstrapper>();
        builder.Services.AddScoped<DatabaseInitializer>();
        builder.Services.AddScoped<Func<MoneyGestorContext>>(services =>
            () => services.GetRequiredService<IDbContextFactory<MoneyGestorContext>>().CreateDbContext());
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

        if (app.Environment.IsDevelopment() || isTesting) {
            app.UseSwagger();
            app.UseSwaggerUI(options => {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "MoneyGestor API v1");
                options.SwaggerEndpoint("/swagger/legacy/swagger.json", "MoneyGestor Legacy API (deprecated)");
            });
        }
        app.UseExceptionHandler();
        app.UseHttpsRedirection();
        app.UseRouting();
        app.UseCors("CorsPolicy");
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
        app.UseMiddleware<LegacyCookieBridgeMiddleware>();
        app.UseAuthorization();
        app.MapControllers();

        if (!isTesting) {
            app.UseSerilogRequestLogging(options => {
                options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms (TraceId: {TraceId})";
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                    diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
            });
        }

        return app;
    }

    internal static async Task InitializeApplicationAsync(
        WebApplication app,
        CancellationToken cancellationToken = default) {
        await using var scope = app.Services.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var databaseOptions = services.GetRequiredService<IOptions<DatabaseOptions>>().Value;
        var emailOptions = services.GetRequiredService<IOptions<EmailOptions>>().Value;

        if (app.Environment.IsProduction() && !emailOptions.IsConfigured) {
            throw new InvalidOperationException("Email delivery must be configured in Production.");
        }

        var legacyDatabase = services.GetRequiredService<MoneyGestorContext>();
        var bootstrapOutcome = await services.GetRequiredService<LegacyDatabaseBootstrapper>()
            .BootstrapAsync(databaseOptions.BootstrapMode, cancellationToken);

        var identityDatabase = services.GetRequiredService<IdentityAccountContext>();
        var pendingMigrations = (await identityDatabase.Database
            .GetPendingMigrationsAsync(cancellationToken)).ToArray();
        if (pendingMigrations.Length > 0 && databaseOptions.BootstrapMode == DatabaseBootstrapMode.Disabled) {
            throw new InvalidOperationException(
                $"{pendingMigrations.Length} Identity migration(s) are pending while database bootstrap is disabled.");
        }
        if (pendingMigrations.Length > 0) {
            await identityDatabase.Database.MigrateAsync(cancellationToken);
        }

        await services.GetRequiredService<DatabaseInitializer>().InitAsync(cancellationToken);
        await DataIntegrityPreflight.EnsureValidAsync(legacyDatabase);
        await services.GetRequiredService<LegacyIdentityBootstrapper>().RunAsync(cancellationToken);

        Log.Information(
            "Database initialized ({BootstrapOutcome}, {IdentityMigrationCount} Identity migration(s) applied)",
            bootstrapOutcome,
            pendingMigrations.Length);
    }

    internal static Boolean ShouldEnableDatabaseLogging(
        Boolean isDevelopment,
        Serilog.Events.LogEventLevel configuredLevel) =>
        isDevelopment && configuredLevel == Serilog.Events.LogEventLevel.Verbose;

    private static void AddApplicationSettings(WebApplicationBuilder builder) {
        var path = Environment.GetEnvironmentVariable("BACKEND_APP_SETTINGS") ?? "./settings.json";
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath)) {
            throw new FileNotFoundException("The backend settings file does not exist.", fullPath);
        }

        builder.Configuration
            .AddJsonFile(fullPath, optional: false, reloadOnChange: false)
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
            .Validate(EmailOptions.IsValid, "Email port and frontend base URL must be valid.")
            .ValidateOnStart();
    }

    private static void AddDatabaseServices(IServiceCollection services, IWebHostEnvironment environment) {
        services.AddDbContextFactory<MoneyGestorContext>((serviceProvider, options) => {
            var database = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            var logging = serviceProvider.GetRequiredService<IOptions<LogOptions>>().Value;
            options.UseMySQL(database.CreateConnectionString());
            if (ShouldEnableDatabaseLogging(environment.IsDevelopment(), logging.GetLevel())) {
                options.LogTo(Log.Verbose, Microsoft.Extensions.Logging.LogLevel.Debug);
            }
        });
        services.AddScoped(services =>
            services.GetRequiredService<IDbContextFactory<MoneyGestorContext>>().CreateDbContext());
        services.AddDbContext<IdentityAccountContext>((serviceProvider, options) => {
            var database = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            options.UseMySQL(database.CreateConnectionString());
        });
    }
}

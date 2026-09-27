using database;
using database.Identity;
using logic;
using logic.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Serilog;
using webserver.Auth;

namespace webserver;

public class Program {
    public static async Task Main(String[] args) {
        var app = BuildApplication(args);
        await InitializeApplicationAsync(app);
        await app.RunAsync();
    }

    public static WebApplication BuildApplication(String[] args) {
        var builder = WebApplication.CreateBuilder(args);
        var isTesting = builder.Environment.IsEnvironment("Testing");

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

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
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
        builder.Services.AddScoped<LegacyIdentityBootstrapper>();
        builder.Services.AddScoped<LegacyDatabaseBootstrapper>();
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
            app.UseSwaggerUI();
        }
        app.UseExceptionHandler();
        app.UseHttpsRedirection();
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
                    await context.Response.WriteAsJsonAsync(new Microsoft.AspNetCore.Mvc.ProblemDetails {
                        Status = StatusCodes.Status400BadRequest,
                        Title = "Invalid antiforgery token"
                    });
                    return;
                }
            }
            await next(context);
        });
        app.UseAuthentication();
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
        services.AddDbContext<MoneyGestorContext>((serviceProvider, options) => {
            var database = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            var logging = serviceProvider.GetRequiredService<IOptions<LogOptions>>().Value;
            options.UseMySQL(database.CreateConnectionString());
            if (ShouldEnableDatabaseLogging(environment.IsDevelopment(), logging.GetLevel())) {
                options.LogTo(Log.Verbose, Microsoft.Extensions.Logging.LogLevel.Debug);
            }
        });
        services.AddDbContext<IdentityAccountContext>((serviceProvider, options) => {
            var database = serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            options.UseMySQL(database.CreateConnectionString());
        });
    }
}

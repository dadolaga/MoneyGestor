
using database;
using database.Identity;
using logic;
using logic.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Serilog;
using webserver.Auth;

namespace webserver {
    public class Program {
        public static void Main(String[] args) {
            var app = BuildApplication(args);

            app.Run();
        }

        public static WebApplication BuildApplication(String[] args) {
            var builder = WebApplication.CreateBuilder(args);
            var isTesting = builder.Environment.IsEnvironment("Testing");

            if (!isTesting) {
                Settings.Load();

                if (builder.Environment.IsProduction() && !Settings.Email.IsConfigured) {
                    throw new InvalidOperationException("Email delivery must be configured in Production.");
                }
                if (builder.Environment.IsProduction() &&
                    String.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("DATA_PROTECTION_KEYS_PATH"))) {
                    throw new InvalidOperationException("DATA_PROTECTION_KEYS_PATH must reference persistent protected storage in Production.");
                }

                Log.Logger = LoggerFactory.Create();

                var enableDatabaseLogging = ShouldEnableDatabaseLogging(
                    builder.Environment.IsDevelopment(),
                    Settings.Log.Level);

                MoneyGestorContext.Initialize(
                    Settings.Database.Server,
                    Settings.Database.Port,
                    Settings.Database.DatabaseName,
                    Settings.Database.User,
                    Settings.Database.Password,
                    enableDatabaseLogging);
                IdentityAccountContext.Initialize(
                    Settings.Database.Server,
                    Settings.Database.Port,
                    Settings.Database.DatabaseName,
                    Settings.Database.User,
                    Settings.Database.Password);

                Log.Information("Start application with version {a}", "0.0.1-alpha");

                Log.Information("Create DB");

                using (var database = new MoneyGestorContext()) {
                    database.Database.EnsureCreated();
                }

                DatabaseInitializer.Init().Wait();

                using (var database = new MoneyGestorContext()) {
                    DataIntegrityPreflight.EnsureValidAsync(database).GetAwaiter().GetResult();
                }

                Log.Information("Database created");

                builder.Host.UseSerilog();
            }

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var allowedOrigins = isTesting
                ? new[] { "http://localhost:3000" }
                : Settings.Security.AllowedOrigins;
            builder.Services.AddCors(options => options.AddPolicy("CorsPolicy", policy => policy
                .WithOrigins(allowedOrigins)
                .AllowCredentials()
                .AllowAnyHeader()
                .AllowAnyMethod()));

            builder.Services.AddDbContext<IdentityAccountContext>(IdentityAccountContext.Configure);
            var dataProtection = builder.Services.AddDataProtection().SetApplicationName("MoneyGestor");
            if (!isTesting) {
                var configuredKeyPath = Environment.GetEnvironmentVariable("DATA_PROTECTION_KEYS_PATH");
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

            if (!isTesting) {
                using var scope = app.Services.CreateScope();
                var identityDatabase = scope.ServiceProvider.GetRequiredService<IdentityAccountContext>();
                var pendingMigrations = identityDatabase.Database.GetPendingMigrations().ToArray();
                if (pendingMigrations.Length > 0 && !Settings.Database.ForceUpdate) {
                    throw new InvalidOperationException(
                        "Identity database migrations are pending. Review them and set database.forceUpdate=true for the controlled deployment.");
                }
                if (pendingMigrations.Length > 0) {
                    identityDatabase.Database.Migrate();
                }
                scope.ServiceProvider.GetRequiredService<LegacyIdentityBootstrapper>()
                    .RunAsync().GetAwaiter().GetResult();
            }

            // Configure the HTTP request pipeline.
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
                        await context.RequestServices.GetRequiredService<Microsoft.AspNetCore.Antiforgery.IAntiforgery>()
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

        internal static Boolean ShouldEnableDatabaseLogging(
            Boolean isDevelopment,
            Serilog.Events.LogEventLevel configuredLevel) =>
            isDevelopment && configuredLevel == Serilog.Events.LogEventLevel.Verbose;
    }
}

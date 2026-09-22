
using database;
using logic;
using Serilog;

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

                Log.Logger = LoggerFactory.Create();

                MoneyGestorContext.Initialize(Settings.Database.Server, Settings.Database.Port, Settings.Database.DatabaseName, Settings.Database.User, Settings.Database.Password);

                Log.Information("Start application with version {a}", "0.0.1-alpha");

                Log.Information("Create DB");

                using (var database = new MoneyGestorContext()) {
                    database.Database.EnsureCreated();
                }

                DatabaseInitializer.Init().Wait();

                Log.Information("Database created");

                builder.Host.UseSerilog();
            }

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddCors(options => options.AddPolicy("CorsPolicy", policy => policy.WithOrigins("*").AllowAnyHeader().AllowAnyMethod()));

            builder.Services.AddExceptionHandler<MoneyGestorExceptionHandler>();
            builder.Services.AddProblemDetails();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment() || isTesting) {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            if (!isTesting) {
                app.UseSerilogRequestLogging();
            }

            app.UseCors();

            app.UseExceptionHandler();

            return app;
        }
    }
}

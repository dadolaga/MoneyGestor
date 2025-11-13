
using database;
using Serilog;

namespace webserver {
    public class Program {
        public static void Main(string[] args) {
            Settings.Load();

            Log.Logger = LoggerFactory.Create(); 

            MoneyGestorContext.Initialize(Settings.Database.DatabaseName, Settings.Database.User, Settings.Database.Password);

            Log.Information("Start application with version {a}", "0.0.1-alpha");

            Log.Information("Create DB");

            using(var database = new MoneyGestorContext()) {
                database.Database.EnsureCreated();
            }

            Log.Information("Database created");

            var builder = WebApplication.CreateBuilder(args);       
            
            builder.Host.UseSerilog();

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment()) {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.UseSerilogRequestLogging();

            app.Run();
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace database {
    public class MoneyGestorContext : DbContext {
        private static string? name_;
        private static string? user_;
        private static string? password_;

        public static void Initialize(string name, string user, string password) {
            name_ = name;
            user_ = user;
            password_ = password;
        }

        public MoneyGestorContext() {
            if (name_ == null || user_ == null || password_ == null) {
                Log.Fatal("Database must be initialize before use it");
                Environment.Exit(1);
            }
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) {
            try {
                optionsBuilder.UseMySQL($"Server=localhost;Port=3306;Database={name_};Uid={user_};Pwd={password_};");
            } catch (Exception ex) {
                Log.Fatal(ex, "Fail connection to DB");
                Environment.Exit(1);
            }
        }
        
    }
}

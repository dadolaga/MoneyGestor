using database.Models;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace database {
    public class MoneyGestorContext : DbContext {
        private static String? name_;
        private static String? user_;
        private static String? password_;

        public DbSet<UserDb> Users { get; set; }
        public DbSet<LoginDb> Logins { get; set; }
        public DbSet<ColorDb> Colors { get; set; }
        public DbSet<WalletDb> Wallets { get; set; }
        public DbSet<TransactionTypeDb> TransactionTypes { get; set; }
        public DbSet<TransactionDb> Transactions { get; set; }

        public static void Initialize(String name, String user, String password) {
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

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            // Set primary key
            modelBuilder.Entity<UserDb>()
                .HasKey(u => u.Id);

            modelBuilder.Entity<TransactionTypeDb>()
                .HasKey(tt => tt.Id);

            modelBuilder.Entity<ColorDb>()
                .HasIndex(c => c.Id);

            modelBuilder.Entity<WalletDb>()
                .HasIndex(w => w.Id);

            modelBuilder.Entity<LoginDb>()
                .HasIndex(l => l.Id);

            modelBuilder.Entity<TransactionDb>()
                .HasIndex(t => t.Id);

            // Set index
            modelBuilder.Entity<UserDb>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<UserDb>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<TransactionTypeDb>()
                .HasIndex(tt => new { tt.UserId, tt.Name })
                .IsUnique();

            modelBuilder.Entity<ColorDb>()
                .HasIndex(c => new { c.Name, c.Value, c.UserId })
                .IsUnique();

            modelBuilder.Entity<WalletDb>()
                .HasIndex(w => new { w.Name, w.UserId })
                .IsUnique();

            modelBuilder.Entity<LoginDb>()
                .HasIndex(l => l.Token)
                .IsUnique();

            // Foreign key
            modelBuilder.Entity<TransactionTypeDb>()
                .HasOne(tt => tt.User)
                .WithMany(u => u.Types)
                .HasForeignKey(tt => tt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ColorDb>()
                .HasOne(c => c.User)
                .WithMany(u => u.Colors)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WalletDb>()
                .HasOne(w => w.Color)
                .WithMany(c => c.Wallets)
                .HasForeignKey(w => w.ColorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WalletDb>()
                .HasOne(w => w.User)
                .WithMany(u => u.Wallets)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<LoginDb>()
                .HasOne(l => l.User)
                .WithMany(u => u.Logins)
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TransactionDb>()
                .HasOne(t => t.TransactionType)
                .WithMany(tt => tt.Transactions)
                .HasForeignKey(t => t.TransactionDestinationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransactionDb>()
                .HasOne(t => t.User)
                .WithMany(u => u.Transactions)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransactionDb>()
                .HasOne(t => t.UserInsert)
                .WithMany(u => u.TransactionsInsert)
                .HasForeignKey(t => t.UserInsertId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransactionDb>()
                .HasOne(t => t.Wallet)
                .WithMany(w => w.Transactions)
                .HasForeignKey(t => t.WalletId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TransactionDb>()
                .HasOne(t => t.TransactionDestination)
                .WithOne(t => t.TransactionDestinationBack)
                .HasForeignKey<TransactionDb>(t => t.TransactionDestinationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
using database.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace database {
    public class MoneyGestorContext : DbContext {

        public DbSet<UserDb> Users { get; set; }
        public DbSet<LoginDb> Logins { get; set; }
        public DbSet<ColorDb> Colors { get; set; }
        public DbSet<WalletDb> Wallets { get; set; }
        public DbSet<TransactionTypeDb> TransactionTypes { get; set; }
        public DbSet<TransactionDb> Transactions { get; set; }

        public MoneyGestorContext(DbContextOptions<MoneyGestorContext> options)
            : base(options) {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            var wallets = modelBuilder.Entity<WalletDb>();
            wallets.Property(wallet => wallet.Kind).HasMaxLength(16).HasDefaultValue("bank");
            wallets.Property(wallet => wallet.Currency).HasMaxLength(3).HasDefaultValue("EUR");
            wallets.Property(wallet => wallet.Institution).HasMaxLength(100);
            wallets.Property(wallet => wallet.Iban).HasMaxLength(34);
            wallets.Property(wallet => wallet.LastFour).HasMaxLength(4);
            wallets.Property(wallet => wallet.Network).HasMaxLength(16);
            wallets.Property(wallet => wallet.Expiry).HasMaxLength(7);
            wallets.Property(wallet => wallet.Notes).HasMaxLength(200);
            wallets.Property(wallet => wallet.CreditLimit).HasPrecision(19, 2);
            wallets.Property(wallet => wallet.CurrentSpending).HasPrecision(19, 2);
            wallets.HasOne(wallet => wallet.LinkedAccount).WithMany()
                .HasForeignKey(wallet => wallet.LinkedAccountId).OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WalletDb>()
                .Property(wallet => wallet.Value)
                .HasPrecision(19, 2);

            modelBuilder.Entity<WalletDb>()
                .Property(wallet => wallet.CurrentValue)
                .HasPrecision(19, 2);

            modelBuilder.Entity<WalletDb>()
                .Property(wallet => wallet.BalanceVersion)
                .IsConcurrencyToken();

            modelBuilder.Entity<TransactionDb>()
                .Property(transaction => transaction.Value)
                .HasPrecision(19, 2);

            modelBuilder.Entity<TransactionDb>()
                .Property(transaction => transaction.Date)
                .HasColumnType("date")
                .HasConversion(
                    date => date.ToDateTime(TimeOnly.MinValue),
                    value => DateOnly.FromDateTime(value));

            modelBuilder.Entity<TransactionDb>()
                .Property(transaction => transaction.Description)
                .HasMaxLength(255);

            modelBuilder.Entity<TransactionDb>()
                .Property(transaction => transaction.LongDescription)
                .HasMaxLength(4000);

            modelBuilder.Entity<TransactionDb>()
                .ToTable("transaction", table =>
                    table.HasCheckConstraint("CK_transaction_Value_NonZero", "`Value` <> 0"));

            modelBuilder.Entity<TransactionDb>()
                .HasIndex(transaction => new { transaction.UserId, transaction.Date });

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
                .HasForeignKey(t => t.TransactionTypeId)
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
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}

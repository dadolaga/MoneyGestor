using database;
using ExportImportApplication.Models;
using ExportImportApplication.Utils;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;
using Serilog;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace ExportImportApplication.Imports {
    internal class Import1_0_0 : ImportBase, IImport {
        public Import1_0_0(String? baseFolder) : base(baseFolder) {
        }

        public void Import(ExportDetails exportDetails) {
            base.exportDetails = exportDetails;
            Log.Information("Starting import process for version 1.0.0...");

            using (context = new database.MoneyGestorContext()) {
                var originalConnectionString = context.Database.GetConnectionString();
                var connectionStringBuilder = new MySqlConnectionStringBuilder(originalConnectionString);
                var originalDatabaseName = connectionStringBuilder.Database;
                var newDatabaseName = $"{originalDatabaseName}_{RandomString(4)}";

                Log.Information($"Renaming original database to {newDatabaseName}...");
                connectionStringBuilder.Database = "";
                RenameDatabase(connectionStringBuilder.ConnectionString, originalDatabaseName, newDatabaseName);

                Log.Information("Creating new database...");
                context.Database.EnsureCreated();

                using (transaction = context.Database.BeginTransaction()) {
                    try {
                        InsertUser();
                        InsertColor();
                        InsertTransactionType();
                        InsertWallet();
                        InsertTransaction();

                        transaction.Commit();
                        Log.Information("Transaction committed successfully.");

                        DeleteDatabase(connectionStringBuilder.ConnectionString, newDatabaseName);
                    } catch (Exception ex) {
                        transaction.Rollback();

                        Log.Error($"Fail to import: {ex.Message}");

                        DeleteDatabase(connectionStringBuilder.ConnectionString, originalDatabaseName);
                        RenameDatabase(connectionStringBuilder.ConnectionString, newDatabaseName, originalDatabaseName);

                        throw;
                    }
                }
            }
        }

        private void RenameDatabase(String masterConnectionString, String originalName, String newName) {
            using var connection = new MySqlConnection(masterConnectionString);
            connection.Open();

            var controlQuery = @"
    SELECT SCHEMA_NAME 
    FROM information_schema.SCHEMATA 
    WHERE SCHEMA_NAME IN (@old, @new)";

            Boolean oldExist = false;
            Boolean newExist = false;

            using (var cmdCheck = new MySqlCommand(controlQuery, connection)) {
                cmdCheck.Parameters.AddWithValue("@old", originalName);
                cmdCheck.Parameters.AddWithValue("@new", newName);

                using (var reader = cmdCheck.ExecuteReader()) {
                    while (reader.Read()) {
                        String foundSchema = reader.GetString(0);
                        if (foundSchema.Equals(originalName, StringComparison.OrdinalIgnoreCase)) {
                            oldExist = true;
                        }

                        if (foundSchema.Equals(newName, StringComparison.OrdinalIgnoreCase)) {
                            newExist = true;
                        }
                    }
                }
            }

            if (!oldExist) {
                throw new InvalidOperationException($"Current DB does not exist: '{originalName}'");
            }

            if (newExist) {
                throw new InvalidOperationException($"New database '{newName}' already exists");
            }

            using (var cmdCreate = new MySqlCommand($"CREATE DATABASE `{newName}`;", connection)) {
                cmdCreate.ExecuteNonQuery();
            }

            var tables = new List<String>();
            var tablesQuery = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = @old AND TABLE_TYPE = 'BASE TABLE'";

            using (var cmdTables = new MySqlCommand(tablesQuery, connection)) {
                cmdTables.Parameters.AddWithValue("@old", originalName);
                using (var reader = cmdTables.ExecuteReader()) {
                    while (reader.Read()) {
                        tables.Add(reader.GetString(0));
                    }
                }
            }

            foreach (var table in tables) {
                String renameTableSql = $"RENAME TABLE `{originalName}`.`{table}` TO `{newName}`.`{table}`;";
                using (var cmdRenameTable = new MySqlCommand(renameTableSql, connection)) {
                    cmdRenameTable.ExecuteNonQuery();
                }
            }

            using (var cmdDrop = new MySqlCommand($"DROP DATABASE `{originalName}`;", connection)) {
                cmdDrop.ExecuteNonQuery();
            }

            Log.Debug($"Database renamed from '{originalName}' to '{newName}'");
        }

        private void DeleteDatabase(String masterConnectionString, String databaseName) {
            using var connection = new MySqlConnection(masterConnectionString);
            connection.Open();

            using (var cmdDrop = new MySqlCommand($"DROP DATABASE `{databaseName}`;", connection)) {
                cmdDrop.ExecuteNonQuery();
            }

            Log.Debug($"Deleted '{databaseName}");
        }

        private void InsertUser() {
            var csvFilePath = RetrieveCsvFilePath("user");
            var csvReader = new CsvReader(csvFilePath, baseFolder, ',');

            if (context == null || context.Database.GetDbConnection().State != System.Data.ConnectionState.Open) {
                return;
            }

            Log.Information("Inserting users...");
            Int32 count = 0;
            foreach (var row in csvReader.ReadAll()) {
                context.Users.Add(new database.Models.UserDb {
                    Id = row[0].ParseCsv<UInt64>(),
                    Firstname = row[1].ParseCsv<String>(),
                    Lastname = row[2].ParseCsv<String>(),
                    Email = row[3].ParseCsv<String>(),
                    Username = row[4].ParseCsv<String>(),
                    Password = row[5].ParseCsv<String>()
                });
                count++;
            }

            context.SaveChanges();
            Log.Information($"Inserted {count} users.");
        }

        private void InsertColor() {
            var csvFilePath = RetrieveCsvFilePath("color");
            var csvReader = new CsvReader(csvFilePath, baseFolder, ',');

            if (context == null || context.Database.GetDbConnection().State != System.Data.ConnectionState.Open) {
                return;
            }

            Log.Information("Inserting colors...");
            Int32 count = 0;
            foreach (var row in csvReader.ReadAll()) {
                context.Colors.Add(new database.Models.ColorDb {
                    Id = row[0].ParseCsv<UInt64>(),
                    Name = row[1].ParseCsv<String?>(),
                    Value = row[2].ParseCsv<UInt32>(),
                    UserId = row[3].ParseCsv<UInt64?>()
                });
                count++;
            }

            context.SaveChanges();
            Log.Information($"Inserted {count} colors.");
        }

        private void InsertTransactionType() {
            var csvFilePath = RetrieveCsvFilePath("transaction_type");
            var csvReader = new CsvReader(csvFilePath, baseFolder, ',');

            if (context == null || context.Database.GetDbConnection().State != System.Data.ConnectionState.Open) {
                return;
            }

            Log.Information("Inserting transaction types...");
            Int32 count = 0;
            foreach (var row in csvReader.ReadAll()) {
                context.TransactionTypes.Add(new database.Models.TransactionTypeDb {
                    Id = row[0].ParseCsv<UInt64>(),
                    Name = row[1].ParseCsv<String>(),
                    UserId = row[2].ParseCsv<UInt64?>()
                });
                count++;
            }

            context.SaveChanges();
            Log.Information($"Inserted {count} transaction types.");
        }

        private void InsertWallet() {
            var csvFilePath = RetrieveCsvFilePath("wallet");
            var csvReader = new CsvReader(csvFilePath, baseFolder, ',');

            if (context == null || context.Database.GetDbConnection().State != System.Data.ConnectionState.Open) {
                return;
            }

            Log.Information("Inserting wallets...");
            Int32 count = 0;
            foreach (var row in csvReader.ReadAll()) {
                context.Wallets.Add(new database.Models.WalletDb {
                    Id = row[0].ParseCsv<UInt64>(),
                    Name = row[1].ParseCsv<String>(),
                    Value = row[2].ParseCsv<Double>(),
                    CurrentValue = row[3].ParseCsv<Double>(),
                    Favorite = row[4].ParseCsv<Boolean>(),
                    ColorId = row[5].ParseCsv<UInt64>(),
                    UserId = row[6].ParseCsv<UInt64>(),
                });
                count++;
            }

            context.SaveChanges();
            Log.Information($"Inserted {count} wallets.");
        }

        private void InsertTransaction() {
            var csvFilePath = RetrieveCsvFilePath("transaction");
            var csvReader = new CsvReader(csvFilePath, baseFolder, ',');

            if (context == null || context.Database.GetDbConnection().State != System.Data.ConnectionState.Open) {
                return;
            }

            Log.Information("Inserting transactions...");
            Int32 count = 0;
            foreach (var row in csvReader.ReadAll()) {
                context.Transactions.Add(new database.Models.TransactionDb {
                    Id = row[0].ParseCsv<UInt64>(),
                    Description = row[1].ParseCsv<String?>(),
                    LongDescription = row[2].ParseCsv<String?>(),
                    Date = row[3].ParseCsv<DateTime>(),
                    TransactionTypeId = row[4].ParseCsv<UInt64>(),
                    UserId = row[5].ParseCsv<UInt64>(),
                    UserInsertId = row[6].ParseCsv<UInt64>(),
                    WalletId = row[7].ParseCsv<UInt64>(),
                    Value = row[8].ParseCsv<Double>(),
                });
                count++;
            }

            context.SaveChanges();
            Log.Information($"Inserted {count} base transactions.");

            Log.Information("Updating transaction transfers...");
            Int32 updateCount = 0;
            foreach (var row in csvReader.ReadAll()) {
                var transactionDestinationId = row[9].ParseCsv<UInt64?>();

                if (transactionDestinationId != null) {
                    var transactionToUpdate = context.Transactions.Find(row[0].ParseCsv<UInt64>())
                        ?? throw new KeyNotFoundException($"Transaction ({row[0]}) not found");

                    transactionToUpdate.TransactionDestinationId = transactionDestinationId;

                    context.Transactions.Update(transactionToUpdate);
                    updateCount++;
                }
            }

            context.SaveChanges();
            Log.Information($"Updated {updateCount} transactions with destination.");
        }
    }
}

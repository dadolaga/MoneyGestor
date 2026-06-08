using database;
using ExportImportApplication.Models;
using ExportImportApplication.Utils;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ExportImportApplication.Export {
    internal class Export : IExport {
        public static readonly String EXPORT_DETAIL_FILE_NAME = "export_detail.json";

        private const Int32 MAX_ROW_FOR_FILE = 10000;
        private const Int32 MAX_ROW_IN_MEMORY = 1000;

        private readonly String tempFolder;
        private readonly String destinationFile;

        public Export(String destinationFile) {
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            tempFolder = Directory.CreateTempSubdirectory($"export_data_{timestamp}").FullName;
            this.destinationFile = destinationFile;

            Log.Debug($"Temporary folder: {tempFolder}");
        }

        void IExport.Export() {
            var exportDetail = new ExportDetails() {
                Version = "1.0.0",
                Tables = new List<TableDetails>()
            };

            using (var databese = new MoneyGestorContext()) {
                exportDetail.Tables.Add(new TableDetails() {
                    Name = "user",
                    FilePaths = UserExport(databese)
                });
                exportDetail.Tables.Add(new TableDetails() {
                    Name = "color",
                    FilePaths = ColorExport(databese)
                });
                exportDetail.Tables.Add(new TableDetails() {
                    Name = "transaction_type",
                    FilePaths = TransactionTypeExport(databese)
                });
                exportDetail.Tables.Add(new TableDetails() {
                    Name = "wallet",
                    FilePaths = WalletExport(databese)
                });
                exportDetail.Tables.Add(new TableDetails() {
                    Name = "transaction",
                    FilePaths = TransactionExport(databese)
                });
            }

            var detailFile = Path.Combine(tempFolder, EXPORT_DETAIL_FILE_NAME);
            File.WriteAllText(detailFile, JsonSerializer.Serialize(exportDetail));

            if (File.Exists(destinationFile)) {
                File.Delete(destinationFile);
            }

            ZipFile.CreateFromDirectory(tempFolder, destinationFile);

            Log.Information($"Data are exported in \"{Path.GetFullPath(destinationFile)}\"");
        }

        private IList<String> UserExport(MoneyGestorContext context) {
            return DatabaseTableExport(
                context,
                "user",
                (context) => context.Users,
                (user) => $"{user.Id.ToCsv()},{user.Firstname.ToCsv()},{user.Lastname.ToCsv()},{user.Email.ToCsv()},{user.Username.ToCsv()},{user.Password.ToCsv()}");
        }

        private IList<String> ColorExport(MoneyGestorContext context) {
            return DatabaseTableExport(
                context,
                "color",
                (context) => context.Colors,
                (color) => $"{color.Id.ToCsv()},{color.Name.ToCsv()},{color.Value.ToCsv()},{CsvUtils.ToCsv(color.UserId)}");
        }

        private IList<String> TransactionTypeExport(MoneyGestorContext context) {
            return DatabaseTableExport(
                context,
                "transaction_type",
                (context) => context.TransactionTypes,
                (type) => $"{type.Id.ToCsv()},{type.Name.ToCsv()},{CsvUtils.ToCsv(type.UserId)}");
        }

        private IList<String> WalletExport(MoneyGestorContext context) {
            return DatabaseTableExport(
                context,
                "wallet",
                (context) => context.Wallets,
                (wallet) => $"{wallet.Id.ToCsv()},{wallet.Name.ToCsv()},{wallet.Value.ToCsv()},{wallet.CurrentValue.ToCsv()},{wallet.Favorite.ToCsv()},{wallet.ColorId.ToCsv()},{wallet.UserId.ToCsv()}");
        }

        private IList<String> TransactionExport(MoneyGestorContext context) {
            return DatabaseTableExport(
                context,
                "transaction",
                (context) => context.Transactions,
                (transaction) => $"{transaction.Id.ToCsv()},{transaction.Description.ToCsv()},{transaction.LongDescription.ToCsv()},{transaction.Date.ToCsv()},{transaction.TransactionTypeId.ToCsv()},{transaction.UserId.ToCsv()},{transaction.UserInsertId.ToCsv()},{transaction.WalletId.ToCsv()},{transaction.Value.ToCsv()},{transaction.TransactionDestinationId.ToCsv()}");
        }

        private IList<String> DatabaseTableExport<T>(MoneyGestorContext context, String name, Func<MoneyGestorContext, IQueryable<T>> extractListFromDatabaseFunction, Func<T, String> convertObjectToStringFunction) {
            var fileList = new List<String>();

            Log.Information($"Start to export {name}");

            if (!Path.Exists(tempFolder)) {
                throw new FileNotFoundException($"\"{tempFolder}\" file not found");
            }

            Boolean stop = false;
            Int32 index = 0;
            Int32 fileCreated = 0;
            Int32 rowInFile = 0;
            while (!stop) {
                var fileName = $"{name}_{index++:D3}.csv";
                var file = Path.Combine(tempFolder, fileName);

                if (File.Exists(file)) {
                    Log.Warning($"File {fileName} already exists. Truncate file");
                    File.WriteAllBytes(file, []);
                } else {
                    var stream = File.Create(file);
                    stream.Flush();
                    stream.Close();
                }

                using (var stream = File.AppendText(file)) {
                    rowInFile = 0;
                    while (!stop) {
                        var objectList = extractListFromDatabaseFunction(context).Skip((fileCreated * MAX_ROW_FOR_FILE) + rowInFile).Take(MAX_ROW_IN_MEMORY).ToList();

                        if (objectList.Count() <= 0) {
                            stop = true;
                        }

                        rowInFile += objectList.Count();

                        foreach (var obj in objectList) {
                            if (obj != null) {
                                var userLine = convertObjectToStringFunction(obj);
                                stream.Write($"{userLine}{Environment.NewLine}");
                            }
                        }

                        if (rowInFile % MAX_ROW_IN_MEMORY != 0) {
                            stop = true;
                        }

                        if (rowInFile % MAX_ROW_FOR_FILE == 0) {
                            break;
                        }

                    }

                    if (rowInFile > 0) {
                        Log.Debug($"Saved {rowInFile} rows in \"{file}\"");

                        stream.Flush();
                        stream.Close();

                        fileList.Add(Path.GetRelativePath(tempFolder, file));
                        fileCreated++;
                    }
                }
            }

            Log.Information($"Exported {((index - 1) * MAX_ROW_FOR_FILE) + rowInFile} rows in {index} files for '{name}'");

            return fileList;
        }
    }
}

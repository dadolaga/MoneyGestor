using database;
using database.Models;
using ExportImportApplication;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.IO.Compression;
using System.Text.Json;

namespace DatabaseTransferTests;

public sealed class ArchiveFormatTest {
    [Test]
    public void CsvPreservesNullEmptyQuotesMultilineUnicodeAndNullLiteral() {
        String?[] original = [null, "", "\\N", "comma,semicolon;", "quote\"text", "line\r\nnext", "caffè 家族", "=formula"];
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        CsvCodec.WriteRow(writer, original);
        using var reader = new StringReader(writer.ToString());
        Assert.That(CsvCodec.ReadRow(reader), Is.EqualTo(original));
        Assert.That(CsvCodec.ReadRow(reader), Is.Null);
    }

    [TestCase("\"unterminated")]
    [TestCase("\"value\"x")]
    [TestCase("plain\n")]
    [TestCase("\\Nothing\n")]
    public void MalformedCsvIsRejected(String text) {
        using var reader = new StringReader(text);
        Assert.Throws<InvalidDataException>(() => CsvCodec.ReadRow(reader));
    }

    [Test]
    public void CurrentContractCoversEveryPersistedScalar() {
        using var database = new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL("Server=127.0.0.1;Database=unused;User ID=unused;Password=unused").Options);
        Assert.DoesNotThrow(() => ArchiveValidation.RequireCompleteContract(database));
    }

    [Test]
    public void ArchiveRejectsUnsupportedVersionChecksumFailureAndDuplicateEntries() {
        var path = Path.Combine(Path.GetTempPath(), $"mg-archive-{Guid.NewGuid():N}.zip");
        try {
            WriteEmpty(path);
            Assert.That(ArchiveFile.Read(path).Rows.Count, Is.EqualTo(ArchiveTable.All.Length));
            using (var zip = ZipFile.Open(path, ZipArchiveMode.Update)) {
                zip.GetEntry("manifest.json")!.Delete();
                using var stream = zip.CreateEntry("manifest.json").Open();
                JsonSerializer.Serialize(stream, new { formatVersion = 999, schemaVersion = 1 });
            }
            Assert.Throws<InvalidDataException>(() => ArchiveFile.Read(path));
            File.Delete(path);
            WriteEmpty(path);
            using (var zip = ZipFile.Open(path, ZipArchiveMode.Update)) {
                zip.GetEntry("colors.csv")!.Delete();
                using var writer = new StreamWriter(zip.CreateEntry("colors.csv").Open());
                writer.Write("corrupt");
            }
            Assert.Throws<InvalidDataException>(() => ArchiveFile.Read(path));
            File.Delete(path);
            WriteEmpty(path);
            using (var zip = ZipFile.Open(path, ZipArchiveMode.Update)) { zip.CreateEntry("colors.csv"); }
            Assert.Throws<InvalidDataException>(() => ArchiveFile.Read(path));
        } finally { File.Delete(path); }
    }

    [TestCase("family", "wrong")]
    [TestCase("mysql", "mysql")]
    [TestCase("SYS", "SYS")]
    [TestCase("information_schema", "information_schema")]
    [TestCase("performance_schema", "performance_schema")]
    public void DeleteRejectsUnconfirmedOrSystemTargetsBeforeConnecting(String databaseName, String confirmation) {
        using var database = new MoneyGestorContext(new DbContextOptionsBuilder<MoneyGestorContext>()
            .UseMySQL($"Server=127.0.0.1;Database={databaseName};User ID=unused;Password=unused").Options);
        Assert.ThrowsAsync<InvalidOperationException>(() => DatabaseTransfer.DeleteAsync(database, confirmation));
    }

    private static void WriteEmpty(String path) {
        var snapshot = new ArchiveSnapshot();
        foreach (var table in ArchiveTable.All) { snapshot.Rows.Add(table.EntityType, []); }
        ArchiveFile.Write(path, snapshot, TimeProvider.System);
    }
}

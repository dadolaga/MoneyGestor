using database;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ExportImportApplication;

internal sealed record ArchiveFileInfo(String Name, Int64 RowCount, String Sha256);
internal sealed record ArchiveManifest(
    Int32 FormatVersion, Int32 SchemaVersion, String ApplicationVersion,
    DateTimeOffset ExportedAtUtc, ArchiveFileInfo[] Files);

internal static class ArchiveFile {
    internal const Int32 CurrentFormatVersion = 1;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
    private static readonly UTF8Encoding Utf8 = new(false, true);

    internal static void Write(String path, ArchiveSnapshot snapshot, TimeProvider timeProvider) {
        // CreateNew protects an existing archive. A failed write is retained for inspection.
        using var file = new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None);
        using var zip = new ZipArchive(file, ZipArchiveMode.Create);
        var files = new List<ArchiveFileInfo>();
        Int64 totalBytes = 0;
        foreach (var table in ArchiveTable.All) {
            var rows = snapshot.Rows[table.EntityType];
            using var csv = new MemoryStream();
            using (var writer = new StreamWriter(csv, Utf8, leaveOpen: true)) {
                writer.NewLine = "\n";
                CsvCodec.WriteRow(writer, table.Properties.Select(property => property.Name));
                foreach (var row in rows) {
                    CsvCodec.WriteRow(writer, table.Properties.Select(property => CsvCodec.Format(property.GetValue(row))));
                }
            }

            var bytes = csv.ToArray();
            totalBytes += bytes.Length;
            if (bytes.Length > 268_435_456 || totalBytes > 1_073_741_824) {
                throw new InvalidDataException("The exported data exceeds the supported archive size.");
            }

            using (var entry = zip.CreateEntry(table.FileName).Open()) {
                entry.Write(bytes);
            }

            files.Add(new ArchiveFileInfo(table.FileName, rows.Count, Convert.ToHexStringLower(SHA256.HashData(bytes))));
        }

        var manifest = new ArchiveManifest(CurrentFormatVersion, DatabaseSchema.CurrentVersion,
            typeof(ArchiveFile).Assembly.GetName().Version?.ToString() ?? "unknown", timeProvider.GetUtcNow(), [.. files]);
        using var manifestStream = zip.CreateEntry("manifest.json").Open();
        JsonSerializer.Serialize(manifestStream, manifest, JsonOptions);
    }

    internal static ArchiveSnapshot Read(String path) {
        using var zip = ZipFile.OpenRead(path);
        if (zip.Entries.Count != ArchiveTable.All.Length + 1 ||
            zip.Entries.Select(entry => entry.FullName).Distinct(StringComparer.Ordinal).Count() != zip.Entries.Count ||
            zip.Entries.Any(entry => entry.Length > 268_435_456) ||
            zip.Entries.Sum(entry => entry.Length) > 1_073_741_824) {
            throw new InvalidDataException("The archive has duplicate/unexpected entries or exceeds the supported size.");
        }

        var manifestEntry = zip.GetEntry("manifest.json");
        if (manifestEntry == null || manifestEntry.Length > 1_048_576) {
            throw new InvalidDataException("The archive manifest is missing or exceeds the supported size.");
        }

        ArchiveManifest manifest;
        try {
            using var stream = manifestEntry.Open();
            manifest = JsonSerializer.Deserialize<ArchiveManifest>(stream, JsonOptions)
                ?? throw new InvalidDataException("The archive manifest is empty.");
        } catch (JsonException) {
            throw new InvalidDataException("The archive manifest is invalid.");
        }
        // v1 is the first supported format. Future converters belong here, before any database writes.
        if (manifest.FormatVersion != CurrentFormatVersion || manifest.SchemaVersion < 1 ||
            manifest.SchemaVersion > DatabaseSchema.CurrentVersion) {
            throw new InvalidDataException("The archive version is unsupported. Use an importer with a complete conversion path for this version.");
        }

        if (String.IsNullOrWhiteSpace(manifest.ApplicationVersion) || manifest.ExportedAtUtc == default ||
            manifest.Files == null || manifest.Files.Length != ArchiveTable.All.Length ||
            manifest.Files.Any(info => info == null) ||
            manifest.Files.Select(info => info.Name).Distinct(StringComparer.Ordinal).Count() != ArchiveTable.All.Length) {
            throw new InvalidDataException("The archive manifest file inventory is invalid.");
        }

        var snapshot = new ArchiveSnapshot();
        foreach (var table in ArchiveTable.All) {
            var info = manifest.Files.SingleOrDefault(item => item.Name == table.FileName);
            var entry = zip.GetEntry(table.FileName);
            if (info == null || info.RowCount < 0 || entry == null) {
                throw new InvalidDataException("The archive is missing a required data file.");
            }

            using var bytes = new MemoryStream();
            using (var stream = entry.Open()) { stream.CopyTo(bytes); }

            if (!String.Equals(Convert.ToHexStringLower(SHA256.HashData(bytes.ToArray())), info.Sha256, StringComparison.Ordinal)) {
                throw new InvalidDataException("An archive file checksum does not match the manifest.");
            }

            bytes.Position = 0;
            using var reader = new StreamReader(bytes, Utf8, detectEncodingFromByteOrderMarks: false);
            var header = CsvCodec.ReadRow(reader);
            if (header == null || !header.SequenceEqual(table.Properties.Select(property => property.Name))) {
                throw new InvalidDataException("An archive CSV header does not match its versioned contract.");
            }

            var rows = new List<Object>();
            String?[]? values;
            while ((values = CsvCodec.ReadRow(reader)) != null) {
                if (values.Length != table.Properties.Length || rows.Count >= info.RowCount) {
                    throw new InvalidDataException("An archive CSV has an unexpected row or column count.");
                }

                var row = Activator.CreateInstance(table.EntityType)!;
                try {
                    for (var column = 0; column < values.Length; column++) {
                        table.Properties[column].SetValue(row, CsvCodec.Parse(values[column], table.Properties[column].PropertyType));
                    }
                } catch (Exception exception) when (exception is FormatException or OverflowException or ArgumentException) {
                    throw new InvalidDataException("An archive CSV contains an invalid scalar value.");
                }

                rows.Add(row);
            }

            if (rows.Count != info.RowCount) {
                throw new InvalidDataException("An archive CSV row count does not match the manifest.");
            }

            snapshot.Rows.Add(table.EntityType, rows);
        }

        return snapshot;
    }
}
using System.Globalization;
using System.Text;

namespace ExportImportApplication;

internal static class CsvCodec {
    // Every non-null field is quoted. The unquoted token \N is the only null representation.
    internal static void WriteRow(TextWriter writer, IEnumerable<String?> values) {
        var fields = values.ToArray();
        if (fields.Length > 100 || fields.Any(value => value?.Length > 1_048_576)) {
            throw new InvalidDataException("An archive CSV row exceeds the supported size.");
        }
        writer.WriteLine(String.Join(',', fields.Select(value => value == null ? "\\N" : "\"" + value.Replace("\"", "\"\"") + "\"")));
    }

    internal static String?[]? ReadRow(TextReader reader) {
        if (reader.Peek() == -1) {
            return null;
        }

        var fields = new List<String?>();
        while (true) {
            String? value;
            var prefix = reader.Read();
            if (prefix == '"') {
                var text = new StringBuilder();
                while (true) {
                    var character = reader.Read();
                    if (character == -1) {
                        throw new InvalidDataException("An archive CSV contains an unterminated quoted field.");
                    }
                    if (character == '"') {
                        if (reader.Peek() != '"') {
                            break;
                        }
                        reader.Read();
                    }
                    text.Append((Char) character);
                    if (text.Length > 1_048_576) {
                        throw new InvalidDataException("An archive CSV field exceeds the supported size.");
                    }
                }
                value = text.ToString();
            } else if (prefix == '\\' && reader.Read() == 'N') {
                value = null;
            } else {
                throw new InvalidDataException("Archive CSV fields must be quoted or use the null token.");
            }

            fields.Add(value);
            var separator = reader.Read();
            if (separator == ',') {
                if (fields.Count > 100) {
                    throw new InvalidDataException("An archive CSV contains too many columns.");
                }
                continue;
            }
            if (separator == '\r') {
                if (reader.Read() != '\n') {
                    throw new InvalidDataException("An archive CSV contains an invalid line ending.");
                }
            } else if (separator != '\n' && separator != -1) {
                throw new InvalidDataException("An archive CSV contains an invalid separator.");
            }
            return fields.ToArray();
        }
    }

    internal static String? Format(Object? value) => value switch {
        null => null,
        String text => text,
        Boolean boolean => boolean ? "true" : "false",
        Decimal money => money.ToString("0.00", CultureInfo.InvariantCulture),
        DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTimeOffset timestamp => timestamp.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        _ => throw new InvalidDataException("An unsupported scalar type was found in the archive contract.")
    };

    internal static Object? Parse(String? value, Type propertyType) {
        var type = Nullable.GetUnderlyingType(propertyType) ?? propertyType;
        if (value == null) {
            return !propertyType.IsValueType || Nullable.GetUnderlyingType(propertyType) != null
                ? null : throw new InvalidDataException("An archive contains null for a required value.");
        }
        if (type == typeof(String)) { return value; }
        if (type == typeof(UInt64)) { return UInt64.Parse(value, NumberStyles.None, CultureInfo.InvariantCulture); }
        if (type == typeof(UInt32)) { return UInt32.Parse(value, NumberStyles.None, CultureInfo.InvariantCulture); }
        if (type == typeof(Int32)) { return Int32.Parse(value, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture); }
        if (type == typeof(Decimal)) {
            return Decimal.Parse(value, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
        }
        if (type == typeof(Boolean)) {
            return value switch { "true" => true, "false" => false, _ => throw new FormatException() };
        }
        if (type == typeof(DateOnly)) { return DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture); }
        if (type == typeof(DateTimeOffset)) { return DateTimeOffset.ParseExact(value, "O", CultureInfo.InvariantCulture); }
        throw new InvalidDataException("An unsupported scalar type was found in the archive contract.");
    }
}

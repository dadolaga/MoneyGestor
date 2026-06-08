using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;

namespace ExportImportApplication.Utils {
    internal static class CsvUtils {
        public static String ToCsv(this String? value) => value != null ? $"\"{value.Replace("\"", "\"\"")}\"" : "NULL";

        public static String ToCsv(this UInt32 value)
            => value.ToString();

        public static String ToCsv(this UInt64 value)
            => value.ToString();

        public static String ToCsv(this UInt64? value)
            => value?.ToString() ?? "NULL";

        public static String ToCsv(this Double value)
            => value.ToString();

        public static String ToCsv(this Double? value)
            => value?.ToString() ?? "NULL";

        public static String ToCsv(this Boolean value)
            => value ? "true" : "false";

        public static String ToCsv(this DateTime value)
            => value.ToString("O"); // Export to ISO8601

        public static String ToCsv(this Decimal? value)
            => value.HasValue ? value.Value.ToString(System.Globalization.CultureInfo.InvariantCulture).Replace(",", ".") : "NULL";

        public static T ParseCsv<T>(this String? value) {
#pragma warning disable IDE0046 // Convert to conditional expression
            if (value == null) {
                throw new ArgumentNullException(nameof(value));
            }

            if (value == "NULL") {
                return IsTypeNullable<T>() ? (T) (Object?) null! : throw new Exception("Value id NULL but type not permitted");
            }

            var notNullType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);

            if (notNullType == typeof(String)) {
                return (T) (Object) value[1..^1];
            }

            if (notNullType == typeof(UInt64)) {
                return (T) (Object) UInt64.Parse(value);
            }

            if (notNullType == typeof(UInt32)) {
                return (T) (Object) UInt32.Parse(value);
            }

            if (notNullType == typeof(Double)) {
                return (T) (Object) Double.Parse(value);
            }

            if (notNullType == typeof(DateTime)) {
                return (T) (Object) DateTime.ParseExact(value, "O", CultureInfo.InvariantCulture);
            }

            if (notNullType == typeof(Boolean)) {
                return (T) (Object) (value == "true" || (value == "false" ? false : throw new Exception("Boolean value only must be \"true\" or \"false\"")));
            }

            throw new Exception("Type not managed");
#pragma warning restore IDE0046 // Convert to conditional expression
        }

        private static Boolean IsTypeNullable<T>() {
            Type type = typeof(T);

            return !type.IsValueType || (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>));
        }
    }
}

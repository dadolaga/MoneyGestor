using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;

namespace webserver.Api;

public sealed class ApiDtoSchemaFilter : ISchemaFilter {
    private static readonly NullabilityInfoContext Nullability = new();

    public void Apply(OpenApiSchema schema, SchemaFilterContext context) {
        if (context.Type.Namespace != "webserver.Api.V1" || schema.Properties is null) return;
        var constructor = context.Type.GetConstructors()
            .OrderByDescending(candidate => candidate.GetParameters().Length)
            .FirstOrDefault();
        foreach (var parameter in constructor?.GetParameters() ?? Array.Empty<ParameterInfo>()) {
            if (parameter.Name is null) continue;
            var propertyName = JsonNamingPolicy.CamelCase.ConvertName(parameter.Name);
            if (!schema.Properties.TryGetValue(propertyName, out var propertySchema)) continue;

            var parameterAttributes = parameter.GetCustomAttributes(true);
            var required = parameterAttributes.OfType<RequiredAttribute>().Any()
                || Nullability.Create(parameter).ReadState == NullabilityState.NotNull;
            if (required) {
                schema.Required ??= new HashSet<String>(StringComparer.Ordinal);
                schema.Required.Add(propertyName);
            }

            var length = parameterAttributes.OfType<StringLengthAttribute>().FirstOrDefault();
            if (length is not null) {
                propertySchema.MinLength = length.MinimumLength;
                propertySchema.MaxLength = length.MaximumLength;
            }
            var range = parameterAttributes.OfType<RangeAttribute>().FirstOrDefault();
            if (range is not null
                && Decimal.TryParse(Convert.ToString(range.Minimum, System.Globalization.CultureInfo.InvariantCulture), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var minimum)
                && Decimal.TryParse(Convert.ToString(range.Maximum, System.Globalization.CultureInfo.InvariantCulture), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var maximum)) {
                propertySchema.Minimum = minimum;
                propertySchema.Maximum = maximum;
            }
        }

        foreach (var property in context.Type.GetProperties(BindingFlags.Public | BindingFlags.Instance)) {
            var propertyName = JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            if (!schema.Properties.TryGetValue(propertyName, out var propertySchema)) continue;
            var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            if (propertyType == typeof(Decimal)) {
                propertySchema.MultipleOf = 0.01m;
                propertySchema.Minimum = -99999999999999999.99m;
                propertySchema.Maximum = 99999999999999999.99m;
            }
        }
    }
}

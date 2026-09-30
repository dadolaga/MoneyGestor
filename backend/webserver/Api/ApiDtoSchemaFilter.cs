using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;

namespace webserver.Api;

public sealed class ApiDtoSchemaFilter : ISchemaFilter {
    private static readonly NullabilityInfoContext Nullability = new();

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context) {
        if (schema is not OpenApiSchema mutableSchema
            || context.Type.Namespace != "webserver.Api.V1"
            || mutableSchema.Properties is null) return;

        var constructor = context.Type.GetConstructors()
            .OrderByDescending(candidate => candidate.GetParameters().Length)
            .FirstOrDefault();
        foreach (var parameter in constructor?.GetParameters() ?? Array.Empty<ParameterInfo>()) {
            if (parameter.Name is null) continue;
            var propertyName = JsonNamingPolicy.CamelCase.ConvertName(parameter.Name);
            if (!mutableSchema.Properties.TryGetValue(propertyName, out var propertySchema)) continue;

            var parameterAttributes = parameter.GetCustomAttributes(true);
            var hasRequiredAttribute = parameterAttributes.OfType<RequiredAttribute>().Any();
            var required = hasRequiredAttribute
                || Nullability.Create(parameter).ReadState == NullabilityState.NotNull;
            if (required) {
                mutableSchema.Required ??= new HashSet<String>(StringComparer.Ordinal);
                mutableSchema.Required.Add(propertyName);
            }
            if (propertySchema is not OpenApiSchema mutablePropertySchema) continue;
            if (hasRequiredAttribute) mutablePropertySchema.Type &= ~JsonSchemaType.Null;

            var length = parameterAttributes.OfType<StringLengthAttribute>().FirstOrDefault();
            if (length is not null) {
                mutablePropertySchema.MinLength = length.MinimumLength;
                mutablePropertySchema.MaxLength = length.MaximumLength;
            }
            var range = parameterAttributes.OfType<RangeAttribute>().FirstOrDefault();
            if (range is not null
                && Decimal.TryParse(Convert.ToString(range.Minimum, System.Globalization.CultureInfo.InvariantCulture), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var minimum)
                && Decimal.TryParse(Convert.ToString(range.Maximum, System.Globalization.CultureInfo.InvariantCulture), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var maximum)) {
                mutablePropertySchema.Minimum = minimum.ToString(System.Globalization.CultureInfo.InvariantCulture);
                mutablePropertySchema.Maximum = maximum.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
        }

        foreach (var property in context.Type.GetProperties(BindingFlags.Public | BindingFlags.Instance)) {
            var propertyName = JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            if (!mutableSchema.Properties.TryGetValue(propertyName, out var propertySchema)) continue;
            if (Nullability.Create(property).ReadState == NullabilityState.NotNull) {
                mutableSchema.Required ??= new HashSet<String>(StringComparer.Ordinal);
                mutableSchema.Required.Add(propertyName);
            }
            if (propertySchema is not OpenApiSchema mutablePropertySchema) continue;
            var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            if (propertyType == typeof(Decimal)) {
                mutablePropertySchema.MultipleOf = 0.01m;
                mutablePropertySchema.Minimum = (-99999999999999999.99m).ToString(System.Globalization.CultureInfo.InvariantCulture);
                mutablePropertySchema.Maximum = 99999999999999999.99m.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
        }
    }
}
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.Swagger;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace webserver.Api;

public static class OpenApiSnapshotWriter {
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public static void Write(ISwaggerProvider provider, String outputDirectory) {
        Directory.CreateDirectory(outputDirectory);
        foreach (var documentName in new[] { "v1", "legacy" }) {
            var buffer = new StringWriter(System.Globalization.CultureInfo.InvariantCulture);
            var writer = new OpenApiJsonWriter(buffer);
            provider.GetSwagger(documentName).SerializeAsV3(writer);
            buffer.Flush();
            var root = JsonNode.Parse(buffer.ToString()) ?? throw new InvalidOperationException($"OpenAPI {documentName} document was empty.");
            var canonical = Canonicalize(root).ToJsonString(JsonOptions) + Environment.NewLine;
            File.WriteAllText(Path.Combine(outputDirectory, $"{documentName}.json"), canonical);
        }
    }

    private static JsonNode Canonicalize(JsonNode node) => node switch {
        JsonObject jsonObject => new JsonObject(jsonObject.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => KeyValuePair.Create(pair.Key, pair.Value == null ? null : Canonicalize(pair.Value)))),
        JsonArray jsonArray => new JsonArray(jsonArray.Select(item => item == null ? null : Canonicalize(item)).ToArray()),
        _ => node.DeepClone()
    };
}

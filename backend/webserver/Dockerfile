# Pinned multi-platform manifest digests. Update SDK with global.json and runtime together.
FROM mcr.microsoft.com/dotnet/sdk:10.0.400@sha256:4beef5b8919dcaa2dc924233bd069257e883cc7a061e09088a97d152d6a48510 AS build

WORKDIR /src

COPY . .

RUN dotnet restore webserver/webserver.csproj --locked-mode
RUN dotnet publish webserver/webserver.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# Runtime-only image; the SDK and build tools are not copied into this stage.
FROM mcr.microsoft.com/dotnet/aspnet:10.0.8@sha256:8c0b6857eab7b2aa57884c839bf4678414606bd7d17370f18a842ac5cf414711

WORKDIR /app

COPY --from=build --chown=app:app /app/publish ./
RUN mkdir -p /app/log /app/data-protection-keys \
    && chown app:app /app/log /app/data-protection-keys \
    && chmod 700 /app/data-protection-keys

ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=6s --start-period=60s --retries=3 CMD ["dotnet", "webserver.dll", "--healthcheck"]

ENTRYPOINT ["dotnet", "webserver.dll"]
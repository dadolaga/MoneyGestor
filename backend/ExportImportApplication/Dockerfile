FROM mcr.microsoft.com/dotnet/sdk:10.0.400@sha256:4beef5b8919dcaa2dc924233bd069257e883cc7a061e09088a97d152d6a48510 AS build
WORKDIR /src
COPY . .
RUN dotnet restore ExportImportApplication/ExportImportApplication.csproj --locked-mode \
    && dotnet publish ExportImportApplication/ExportImportApplication.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/runtime:10.0.8
WORKDIR /app
COPY --from=build --chown=app:app /app/publish ./
COPY --chmod=0555 ExportImportApplication/docker-entrypoint.sh /app/docker-entrypoint.sh
ENV DOTNET_EnableDiagnostics=0
USER app
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]

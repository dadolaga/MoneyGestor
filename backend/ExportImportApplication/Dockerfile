FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY . .

RUN dotnet restore ExportImportApplication/ExportImportApplication.csproj

RUN dotnet publish ExportImportApplication/ExportImportApplication.csproj \
    -c Release \
    -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime:8.0

WORKDIR /app

COPY --from=build /app/publish .

# settings.json sarà montato come volume al runtime
ENTRYPOINT ["dotnet", "ExportImportApplication.dll"]
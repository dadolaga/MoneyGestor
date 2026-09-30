FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY . .

RUN dotnet restore webserver/webserver.csproj --locked-mode
RUN dotnet publish webserver/webserver.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0

WORKDIR /app

COPY --from=build /app/publish .

RUN mkdir -p /app/log

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=6s --start-period=60s --retries=3 CMD ["dotnet", "webserver.dll", "--healthcheck"]

ENTRYPOINT ["dotnet", "webserver.dll"]
# MoneyGestor

MoneyGestor è un'applicazione full-stack per gestire finanze personali: utenti, portafogli, movimenti, trasferimenti tra portafogli, categorie e riepiloghi mensili.

> Stato: progetto in sviluppo. Prima di usarlo con dati reali, consulta la [revisione backend corrente](docs/BACKEND_REVIEW_2026-09-30.md) e il [runbook di rilascio](docs/backend-modernization/RELEASE_RUNBOOK.md).

## Stack

- Backend: ASP.NET Core 10 LTS, Entity Framework Core 10 e MySQL 8.4 LTS (provider Oracle Connector/NET)
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui con primitive Radix e next-intl; MUI resta nelle route legacy e TanStack è escluso
- Test backend: NUnit
- Strumenti: script amministrativi MySQL per backup e restore; la CLI ZIP/CSV storica è disabilitata
- Runtime container: Docker Compose

## Struttura

```text
.
|-- backend/
|   |-- database/                 # DbContext e modelli EF Core
|   |-- logic/                    # comandi, regole applicative e autenticazione
|   |-- webserver/                # REST API ASP.NET Core
|   |-- TestProject/              # test NUnit con MySQL 8.4 effimero via Docker
|   `-- ExportImportApplication/  # entry point storico fail-closed; ZIP/CSV disabilitato
|-- ops/database/                # backup e restore staging MySQL amministrativi
|-- frontend/                     # applicazione Next.js
|-- docs/                         # architettura, API, audit, migrazione e design
|-- docker-compose.yml
|-- settings.example.json
`-- settings.json                 # configurazione locale, ignorata da Git
```

Approfondimenti:

- [Architettura](docs/ARCHITECTURE.md)
- [Contratto API](docs/API.md)
- [OpenAPI v1](docs/openapi/v1.json) e [OpenAPI legacy](docs/openapi/legacy.json)
- [Autenticazione finale, spiegata in modo semplice](docs/AUTHENTICATION.md)
- [Audit storico](docs/PROJECT_AUDIT.md) e [revisione backend corrente](docs/BACKEND_REVIEW_2026-09-30.md)
- [Backup e recovery MySQL](docs/backend-modernization/DATABASE_RECOVERY.md)
- [Piano di migrazione frontend](docs/FRONTEND_MIGRATION_PLAN.md)
- [Baseline frontend — Fase 0](docs/PHASE_0_BASELINE.md)
- [Sistema visuale condiviso](docs/UI_DESIGN_SYSTEM.md)
- [Mockup visuale ufficiale](docs/dashboard_mockup.png)
- [Internazionalizzazione frontend](docs/INTERNATIONALIZATION.md)
- [Guida frontend](frontend/README.md)
- [Convenzioni frontend](frontend/README_DEV.md)

PERF-51 ha completato l'ottimizzazione misurata della dashboard e la propagazione della cancellazione nelle operazioni EF.
PLT-52 ha portato il backend a .NET 10 LTS con pacchetti centralizzati e restore lockati.
QUA-54 ha portato la rebuild backend a zero warning, attivato warning-as-errors e rimosso il template WeatherForecast e il profilo CLI con path personale.
Dettagli e limiti nella [roadmap backend](docs/backend-modernization/ROADMAP.md).

## Prerequisiti

Per lo sviluppo locale:

- .NET SDK 10; `global.json` fissa il feature band minimo 10.0.400
- Node.js 22 e npm
- MySQL raggiungibile dalla macchina
- Docker Desktop per eseguire i test backend con il database effimero

Per l'esecuzione containerizzata servono Docker e Docker Compose. Il file Compose attuale **non avvia MySQL**: il database deve esistere già ed essere raggiungibile dai container.

## Configurazione

Crea la configurazione locale partendo dall'esempio:

```powershell
Copy-Item .\settings.example.json .\settings.json
```

Campi principali:

```json
{
  "log": {
    "level": "Information",
    "output": {
      "console": true,
      "file": {
        "path": "../log/backend/",
        "fileName": "backend"
      }
    }
  },
  "database": {
    "host": "localhost",
    "port": 3306,
    "name": "moneygestor_db",
    "user": "moneygestor_user",
    "password": "CHANGE_ME_IN_PRODUCTION",
    "bootstrapMode": "Disabled"
  },
  "security": {
    "allowedOrigins": ["http://localhost:3000"]
  },
  "email": {
    "host": "smtp.example.com",
    "port": 587,
    "username": "CHANGE_ME",
    "password": "CHANGE_ME",
    "from": "noreply@example.com",
    "useSsl": true,
    "frontendBaseUrl": "http://localhost:3000"
  }
}
```

`settings.json` è ignorato da Git. Non inserirlo nei commit e non usare credenziali di produzione nell'esempio.

`database.bootstrapMode` è `Disabled` per default: con database assente o migration pendenti lo startup si blocca senza
applicare DDL. `Migrate` crea/applica gli schemi MoneyGestor e Identity; `MigrateAndAdoptLegacy` è riservato
all'adozione una tantum di uno schema storico equivalente dopo backup e prova di restore. La procedura completa è nel
[runbook database](docs/backend-modernization/DATABASE_DEPLOYMENT.md). In `Production` sono obbligatori SMTP e
`DATA_PROTECTION_KEYS_PATH`, che deve puntare a storage persistente e protetto. Negli altri ambienti, in assenza della
variabile, le chiavi che cifrano cookie e token vengono persistite accanto ai binari.

Le specifiche OpenAPI versionate si rigenerano senza avviare il database con:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Testing'
dotnet run --project backend/webserver/webserver.csproj -- --export-openapi docs/openapi
```

La CI verifica che gli
artefatti non abbiano diff non revisionati.

### Livelli e sicurezza dei log

I livelli Serilog, gli override di categoria, i sink console/file, directory, nome, rolling, limite dimensione e
retention sono configurati in settings.json (schema: settings.example.json) e diventano effettivi al riavvio. Il
sink file usa rolling giornaliero e size limit; errori del sink sono inoltrati a stderr. log.diagnosticEfLogging abilita
gli eventi SQL solo con ambiente Development e livello Trace/Verbose. In nessun livello vengono scritti valori
parametri SQL, password, token, header Authorization, body o dati delle risposte.

L'API espone /health/live (solo processo), /health/ready (query MySQL SELECT 1 con timeout configurabile) e
/metrics (metriche Prometheus senza label utente o risorsa). Limitare /metrics alla rete di scraping. Ogni risposta
include X-Trace-ID e X-Correlation-ID; gli errori usano lo stesso trace ID nel campo traceId. Consultare il
[runbook OBS-50](docs/backend-modernization/evidence/OBS-50_2026-09-29.md) per segnali e risposta ai guasti.

## Avvio locale

Esegui i comandi dalla radice del repository.

Backend:

```powershell
$env:BACKEND_APP_SETTINGS = (Resolve-Path .\settings.json)
dotnet run --project .\backend\webserver\webserver.csproj --launch-profile http
```

In sviluppo l'API ascolta su `http://localhost:5256`; Swagger è disponibile su `http://localhost:5256/swagger`.

Frontend, in un secondo terminale:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm --prefix .\frontend install
npm --prefix .\frontend run dev
```

Il frontend è disponibile su `http://localhost:3000`.

## Avvio con Docker

Nel file `settings.json`, usa un host MySQL raggiungibile dal container, per esempio `host.docker.internal` quando il database gira sulla macchina host.

```powershell
docker compose up --build -d backend frontend
docker compose logs -f
docker compose ps
docker compose down
```

Servizi esposti:

Backend e frontend sono pubblicati su loopback per default; l'healthcheck del backend viene verificato e il frontend aspetta il backend healthy. Le chiavi Data Protection sono nel volume persistente `backend-data-protection`, separato dal backup MySQL. Non rimuovere i volumi con `docker compose down -v` durante il rilascio. La procedura è nel [runbook release/migration](docs/backend-modernization/RELEASE_RUNBOOK.md).

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`

Swagger è abilitato solo con `ASPNETCORE_ENVIRONMENT=Development`; il Compose imposta `Production`.

## Verifiche

```powershell
dotnet restore .\backend\backend.sln --locked-mode
dotnet build .\backend\backend.sln --no-restore
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run lint
npm --prefix .\frontend run build
```

I test backend avviano automaticamente un container MySQL 8.4 dedicato al singolo run. Il database usa un nome
casuale con prefisso `mg_test_`, una porta dinamica e credenziali casuali; non esiste fallback verso un MySQL locale.
Docker deve essere disponibile:

```powershell
dotnet test .\backend\TestProject\TestProject.csproj --no-restore
```

## Backup e recovery del database

La vecchia CLI ZIP/CSV è disabilitata fail-closed e non è inclusa in Compose. I backup amministrativi usano i client
MySQL 8.4 e un login-path protetto; seguire il [runbook backup e recovery](docs/backend-modernization/DATABASE_RECOVERY.md).
Il formato include l'intero schema MoneyGestor e Identity, quindi contiene dati personali e hash credenziali. Conservare
i dump solo su storage cifrato e con accesso ristretto.

```powershell
mysql_config_editor set --login-path=moneygestor-backup --host=127.0.0.1 --port=3306 --user=moneygestor_ops --password
pwsh -File ./ops/database/New-MoneyGestorBackup.ps1 -Database moneygestor_db -LoginPath moneygestor-backup -OutputDirectory E:\MoneyGestorBackups
```

Il restore crea esclusivamente uno schema `mg_restore_*`; non modifica il database sorgente e non effettua cutover automatico.

## Stato delle verifiche

Verifica backend locale del 30 settembre 2026:

- `dotnet restore backend/backend.sln --locked-mode`: riuscito;
- build Debug e Release della soluzione: 0 errori e 0 warning;
- test account/API mirati: 13/13 superati su MySQL Testcontainers effimero;
- test del preflight integrità: 2/2 superati su MySQL Testcontainers effimero;
- suite completa: interrotta dopo che Docker ha iniziato a restituire `Internal Server Error`; gli ultimi cambi compilano ma attendono una nuova run dei test quando il servizio torna disponibile;
- run GitHub Actions dopo l'aggiornamento a .NET 10: non verificata.

Le verifiche frontend registrate prima di questa revisione restano nelle rispettive evidenze di migrazione. Il dettaglio delle correzioni backend è nella [revisione del 30 settembre](docs/BACKEND_REVIEW_2026-09-30.md).

# MoneyGestor

MoneyGestor è un'applicazione full-stack per gestire finanze personali: utenti, portafogli, movimenti, trasferimenti tra portafogli, categorie e riepiloghi mensili.

> Stato: progetto in sviluppo. Prima di usarlo con dati reali, consulta l'[audit tecnico](docs/PROJECT_AUDIT.md), in particolare le sezioni su autorizzazione, import/export e gestione degli importi.

## Stack

- Backend: ASP.NET Core 8, Entity Framework Core e MySQL
- Frontend attuale: Next.js 15, React 19, TypeScript, Material UI e Nivo
- Frontend in migrazione: Next.js, Tailwind CSS v4, shadcn/ui con primitive Radix e next-intl; MUI resta nelle route legacy e TanStack è escluso
- Test backend: NUnit
- Strumenti: CLI .NET per esportazione e importazione ZIP/CSV
- Runtime container: Docker Compose

## Struttura

```text
.
|-- backend/
|   |-- database/                 # DbContext e modelli EF Core
|   |-- logic/                    # comandi, regole applicative e autenticazione
|   |-- webserver/                # REST API ASP.NET Core
|   |-- TestProject/              # test NUnit con MySQL 8.4 effimero via Docker
|   `-- ExportImportApplication/  # backup e ripristino ZIP/CSV
|-- frontend/                     # applicazione Next.js
|-- docs/                         # architettura, API, audit, migrazione e design
|-- docker-compose.yml
|-- settings.example.json
`-- settings.json                 # configurazione locale, ignorata da Git
```

Approfondimenti:

- [Architettura](docs/ARCHITECTURE.md)
- [Contratto API](docs/API.md)
- [Audit e roadmap consigliata](docs/PROJECT_AUDIT.md)
- [Piano di migrazione frontend](docs/FRONTEND_MIGRATION_PLAN.md)
- [Baseline frontend — Fase 0](docs/PHASE_0_BASELINE.md)
- [Sistema visuale condiviso](docs/UI_DESIGN_SYSTEM.md)
- [Mockup visuale ufficiale](docs/dashboard_mockup.png)
- [Internazionalizzazione frontend](docs/INTERNATIONALIZATION.md)
- [Guida frontend](frontend/README.md)
- [Convenzioni frontend](frontend/README_DEV.md)

## Prerequisiti

Per lo sviluppo locale:

- .NET SDK 8 o successivo
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
    "forceUpdate": false
  }
}
```

`settings.json` è ignorato da Git. Non inserirlo nei commit e non usare credenziali di produzione nell'esempio.

Nota: `forceUpdate` viene letto dalla configurazione ma, allo stato attuale, non viene applicato dal backend.

### Livelli e sicurezza dei log

Il livello `Trace`/`Verbose` abilita gli eventi SQL di EF solo quando il backend gira in ambiente `Development`.
I valori dei parametri SQL, le password, i token, gli header `Authorization`, i body e i dati delle risposte non vengono
mai scritti nei log, a nessun livello. In `Production` il logging EF resta disabilitato anche se il livello configurato è
`Trace`. I file ruotano ogni giorno e vengono conservati per un massimo di 14 file.

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
docker compose down
```

Servizi esposti:

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`

Swagger è abilitato solo con `ASPNETCORE_ENVIRONMENT=Development`; il Compose imposta `Production`.

## Verifiche

```powershell
dotnet build .\backend\backend.sln
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run lint
npm --prefix .\frontend run build
```

I test backend avviano automaticamente un container MySQL 8.4 dedicato al singolo run. Il database usa un nome
casuale con prefisso `mg_test_`, una porta dinamica e credenziali casuali; non esiste fallback verso un MySQL locale.
Docker deve essere disponibile:

```powershell
dotnet test .\backend\TestProject\TestProject.csproj
```

## Import ed export

La CLI legge `IMPORT_EXPORT_APP_SETTINGS`, oppure `./settings.json` se la variabile non è impostata.

```powershell
$env:IMPORT_EXPORT_APP_SETTINGS = (Resolve-Path .\settings.json)
dotnet run --project .\backend\ExportImportApplication\ExportImportApplication.csproj -- export --path .\backup.zip
dotnet run --project .\backend\ExportImportApplication\ExportImportApplication.csproj -- import --path .\backup.zip
```

L'import sostituisce il database applicativo e va considerato distruttivo. Prima di affidarsi a questa funzione, consulta i limiti documentati nell'[audit](docs/PROJECT_AUDIT.md#importexport-e-integrita-dei-dati).

## Stato delle verifiche

Ultima ricognizione frontend: 17 settembre 2026.

- build .NET: completata, 0 errori e 79 warning
- type-check frontend: completato senza errori
- lint frontend: completato senza errori; restano 10 warning legacy già censiti
- test frontend: 20 test Vitest/Testing Library completati senza errori
- build frontend: completata; restano warning legacy e warning non bloccanti della cache Webpack nell'ambiente isolato
- test backend: 76 casi ordinari completati senza errori su MySQL effimero; 4 casi cross-user `Explicit` documentano i gap da chiudere nella Fase 1

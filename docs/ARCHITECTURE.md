# Architettura

Questa descrizione fotografa il repository, aggiornato al 24 settembre 2026.

## Vista generale

```mermaid
flowchart LR
    UI[Next.js / React] -->|HTTP + token grezzo| API[ASP.NET Core Controllers]
    API --> EX[ExecutorManager]
    EX --> CMD[Command applicativi]
    CMD --> EF[MoneyGestorContext]
    API --> EF
    EF --> DB[(MySQL esterno)]
    CLI[ExportImportApplication] --> EF
    CLI --> ZIP[ZIP con CSV e manifest]
```

Il frontend concentra ancora le chiamate HTTP legacy in `frontend/src/hooks/useApi.ts`. Il nuovo boundary di
presentazione usa adapter puri per trasformare i DTO in view model di feature e componenti visuali pilotati tramite
props; fixture locali coprono gli stati `idle`, `loading`, `ready`, `empty` ed `error` senza richiedere il backend. I
controller traducono le richieste nei comandi del progetto `logic`; `ExecutorManager` apre una transazione EF, risolve
l'utente dal token ed esegue il comando. Alcune letture interrogano invece `MoneyGestorContext` direttamente dal
controller.

Dal completamento di ARC-20, `MoneyGestorContext` e `IdentityAccountContext` sono registrati scoped nel container DI.
Controller, servizi account, middleware legacy ed `ExecutorManager` condividono il context della request; la risoluzione
del token e la mutazione composta avvengono quindi nella stessa unit of work e nella stessa transazione esplicita.

Questa è la fotografia dell'implementazione corrente. La destinazione frontend già approvata è Next.js App Router con Tailwind CSS, shadcn/ui su Radix e next-intl, senza TanStack; MUI verrà rimosso progressivamente per slice. Architettura di transizione, confini e ordine operativo sono definiti nel [piano di migrazione frontend](FRONTEND_MIGRATION_PLAN.md), mentre [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) e [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) sono i contratti trasversali.

## Progetti backend

### `database`

Contiene `MoneyGestorContext` e le entità persistenti:

- `UserDb`
- `LoginDb`
- `ColorDb`
- `WalletDb`
- `TransactionTypeDb`
- `TransactionDb`

Il provider è `MySql.EntityFrameworkCore`. Entrambi i context ricevono `DbContextOptions` dal composition root; host,
porta, database e credenziali provengono da options tipizzate validate all'avvio, senza fallback `root/root` né stato
statico nel layer di persistenza.

### `logic`

Contiene:

- autenticazione e generazione token;
- hashing password PBKDF2;
- comandi applicativi per utenti, wallet e transazioni;
- gestione atomica tramite `ExecutorManager`;
- filtri dinamici per lista, ordinamento e paginazione;
- conversione tra entità database e modelli API.

Ogni `Execute` apre una transazione sul context scoped iniettato, aggiorna la scadenza del token sullo stesso context,
esegue il comando e fa commit o rollback. `ExecutorManager` non possiede né smaltisce il context; il lifetime è gestito
dallo scope DI. Il tempo applicativo è fornito da `TimeProvider`, sostituibile nei test.

### `webserver`

Espone controller REST per:

- utenti e login;
- colori;
- wallet;
- tipi di transazione;
- transazioni;
- dashboard.

Swagger viene registrato sempre ma pubblicato solo in ambiente Development. Le risposte applicative usano l'envelope descritto in [API.md](API.md).

### `ExportImportApplication`

CLI per esportare le tabelle in CSV, aggiungere `export_detail.json` e creare un archivio ZIP. L'import crea un database sostitutivo, popola le tabelle e rimuove il precedente database se l'operazione termina con successo.

Questa operazione è ad alto impatto e presenta limiti di affidabilità documentati in [PROJECT_AUDIT.md](PROJECT_AUDIT.md).

### `TestProject`

Suite NUnit per command, guardie infrastrutturali e pipeline HTTP. Gli integration test usano un container MySQL 8.4
effimero per run, con database, credenziali e porta casuali; non esiste fallback verso un database locale condiviso.
La suite validata comprende 118 casi verdi. I casi cross-user fanno parte della suite ordinaria insieme ai test di
ownership, conflitto concorrente, invarianti dei trasferimenti e preflight di integrità introdotti da SEC-11..13.
ARC-20 aggiunge controlli su validazione options, isolamento degli scope e singolo context per mutazione autenticata;
DB-21 copre creazione, migration no-op, adozione/rifiuto della baseline, modalità disabilitata e rollback del seed.
L'esecuzione completa richiede Docker ed è registrata nell'evidenza dello step.

## Modello dati

```mermaid
erDiagram
    USER ||--o{ LOGIN : owns
    USER ||--o{ WALLET : owns
    USER ||--o{ COLOR : may_define
    USER ||--o{ TRANSACTION_TYPE : may_define
    USER ||--o{ TRANSACTION : belongs_to
    USER ||--o{ TRANSACTION : inserted_by
    COLOR ||--o{ WALLET : styles
    WALLET ||--o{ TRANSACTION : contains
    TRANSACTION_TYPE ||--o{ TRANSACTION : classifies
    TRANSACTION o|--o| TRANSACTION : transfer_pair
```

`TransactionDb` conserva sia `UserId` sia `UserInsertId` per compatibilità dello schema, ma la policy corrente è di
ownership singola: entrambi sono sempre impostati all'utente autenticato. Il client non può scegliere l'owner e non
esiste un modello di sharing implicito.

## Regole di dominio osservate

- Un wallet nasce con `Value` e `CurrentValue` uguali.
- Un movimento normale somma il proprio valore a `CurrentValue`.
- I saldi iniziali e correnti possono essere negativi; non esistono bypass `force` nei comandi pubblici o interni.
- Un trasferimento accetta un importo positivo e viene rappresentato da due transazioni reciproche: valore negativo
  nel wallet origine e positivo nel wallet destinazione, con wallet distinti dello stesso owner e somma zero.
- La lista mostra soltanto il lato origine del trasferimento.
- Colori e tipi con `UserId = null` sono globali.
- Colori e tipi privati possono essere associati soltanto a risorse dello stesso utente.
- I tipi globali iniziali sono `Transfer` (ID 1) e `Adjustment` (ID 2).

## Autenticazione attuale

La nuova `/api/v1/auth` usa ASP.NET Core Identity. Il browser riceve soltanto il cookie cifrato `MoneyGestor.Auth`,
`HttpOnly`, `SameSite=Lax` e `Secure` in produzione; le mutazioni `/api/v1` richiedono il token antiforgery dedicato.
Login, sessione, logout, conferma email e recupero password passano dal middleware standard. Gli utenti Identity
mantengono un mapping univoco verso `UserDb.Id`, così ownership e dati finanziari non cambiano.

Gli hash PBKDF2 legacy sono accettati una sola volta dal password hasher compatibile e riscritti nel formato Identity
al primo login riuscito. Gli endpoint non versionati restano temporaneamente compatibili col token grezzo: per il
frontend autenticato un ponte server-side genera l'header legacy senza esporre il token a JavaScript. `/api/v1` non
accetta tale token.

## Avvio e configurazione

Il file indicato da `BACKEND_APP_SETTINGS` viene aggiunto alla configurazione ASP.NET Core; le variabili ambiente con
notazione `Section__Property` possono sovrascriverne i valori. Database, logging, CORS ed email sono bindati a options
tipizzate e validati all'avvio. I campi di connessione mancanti bloccano lo startup senza stampare credenziali.

DB-21 ha sostituito `EnsureCreated` con migration EF versionate per lo schema MoneyGestor e mantiene le migration
Identity nello stesso database. `database.bootstrapMode` governa entrambi i context: `Disabled` è fail-closed,
`Migrate` crea/applica gli schemi e `MigrateAndAdoptLegacy` registra la baseline soltanto dopo un confronto strutturale
completo e senza DDL sullo schema esistente. Il seed globale è un upsert transazionale, idempotente e fail-fast. Il
[runbook di deployment e recovery](backend-modernization/DATABASE_DEPLOYMENT.md) descrive privilegi, backup, adozione
e rollback. Subito dopo lo startup esegue un preflight
read-only su ownership e coppie di trasferimento: eventuali anomalie bloccano l'avvio riportando soltanto conteggi e
ID tecnici, senza correzioni automatiche o PII, e il bootstrap Identity blocca collisioni normalizzate.

Il Compose avvia backend, frontend e, su profilo `tools`, la CLI; MySQL resta esterno.

## Logging sicuro

I log HTTP contengono soltanto metodo, route, status, durata, codice applicativo e trace ID; non includono header,
body o dati della risposta. Il sensitive-data logging di EF è disabilitato. Gli eventi SQL senza valori dei parametri
sono disponibili esclusivamente con livello `Trace`/`Verbose` in ambiente `Development` e restano disabilitati in
`Production`. Gli errori della CLI registrano l'operazione e il tipo di eccezione, non il messaggio potenzialmente
derivato dall'input. I sink su file applicano rolling giornaliero e conservano al massimo 14 file.

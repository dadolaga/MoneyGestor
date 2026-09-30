# Fase 5 — qualità operativa e piattaforma

Obiettivo della fase: rendere il backend osservabile, efficiente e distribuibile in modo riproducibile, quindi chiudere
il debito tecnico residuo. Ottimizzazioni e upgrade non devono precedere i fix di sicurezza/dati.

## OBS-50 — Logging configurabile, health e metriche minime

**Stato:** completato (29 settembre 2026)

**Priorità:** P2

**Obiettivo**

Rendere diagnosticabili errori, dipendenze e operazioni critiche senza esporre dati, con policy dei log gestita da
file di configurazione.

**Situazione attuale**

Serilog e request logging sono stati estesi con correlazione, health check, metriche aggregate e eventi operativi stabili. L'implementazione e descritta nell'[evidenza OBS-50](../evidence/OBS-50_2026-09-29.md).

**Motivazione**

Deploy, migration e autenticazione non possono essere gestiti affidabilmente con stringhe libere o policy hard-coded.

**Prerequisiti**

- API-34;
- SEC-10 già garantisce redazione.

**File coinvolti**

- `backend/webserver/Program.cs`
- `backend/webserver/LoggerFactory.cs`
- exception/auth/session/use case critici
- file di configurazione e relativi example privi di segreti
- Docker/Compose del solo componente applicativo
- documentazione runbook (i test di fault injection sono rinviati alla pipeline CI-53).

**Istruzioni operative**

1. Definire eventi strutturati con event ID/nome per startup, shutdown, auth failure aggregato, migration/bootstrap,
   reconciliation mismatch e retry concorrenza.
2. Propagare `Activity.TraceId`/correlation ID in log e response error; accettare header esterno solo con validazione e
   generare sempre un ID server.
3. Aggiungere liveness senza DB e readiness con check DB leggero/configurabile. Non esporre dettagli/connection string.
4. Aggiungere metriche minime: request rate/latency/error, pool/DB failure disponibili, auth reject e concurrency retry.
   Evitare label con user/wallet/token per cardinalità e privacy.
5. Rendere configurabili da file livelli per categoria, sink console/file, directory, naming, rolling, limite dimensione,
   retention e opzioni diagnostiche. Validare la configurazione all'avvio e fornire default sicuri.
6. Introdurre OpenTelemetry soltanto dopo la scelta di un collector/exporter reale; non è un requisito del logging file.
7. Documentare segnali/allarmi minimi e comportamento quando directory o sink non sono disponibili.
8. Testare override di configurazione, rolling/retention, health DB up/down, trace su 500 e assenza sentinelle sensibili.

**Vincoli**

- nessuna PII/segreto in log/label;
- aumentare il livello non abilita sensitive-data logging né payload finanziari;
- liveness non dipende da MySQL;
- readiness non esegue query costose né mutazioni;
- metriche ad alta cardinalità vietate.

**Rischi**

- health DB aggressivo aumenta carico;
- request logging duplicato produce volume/costo;
- header correlation non validato può causare injection/cardinalità.

**Verifiche**

- test liveness/readiness con fault injection;
- errore API include trace ID presente nel log;
- scan sentinelle/secret;
- test della configurazione file, sink non scrivibile, rolling e retention;
- load breve misura overhead e cardinalità;
- Docker healthcheck usa endpoint appropriato.

**Criteri di completamento**

- stato processo e dipendenze distinguibili;
- errori correlabili end-to-end;
- operazioni critiche hanno start/result/duration sicuri;
- livelli, destinazioni e conservazione cambiano senza ricompilare;
- dashboard/alert minimi o runbook di consultazione definiti.

**Implementazione OBS-50 (29 settembre 2026)**

- X-Trace-ID e X-Correlation-ID sono generati dal server; un X-Correlation-ID entrante viene accettato nei log solo
  se contiene 1-64 caratteri ASCII alfanumerici, punto, trattino o underscore. Gli errori espongono il TraceId.
- /health/live verifica solo il processo; /health/ready esegue SELECT 1 con timeout configurabile. Le risposte non
  includono eccezioni o dettagli di connessione.
- /metrics espone contatori e istogramma Prometheus senza label variabili: richieste, errori HTTP, rifiuti auth,
  errori probe DB, retry concorrenti e durata request.
- Gli auth failure vengono emessi come conteggio aggregato ogni minuto. Bootstrap/migration, mismatch di integrita,
  retry concorrenti, avvio e arresto usano EventId/EventName stabili.
- Livello globale e override categoria, console/file, directory, nome, rolling giornaliero, limite dimensione e retention
  sono in settings.json; modificarli richiede riavviare il processo. log.diagnosticEfLogging resta subordinato a
  Development e al livello Trace. Errori del sink file vengono segnalati su stderr da Serilog SelfLog.
- OpenTelemetry non e stato aggiunto: non e stato scelto un collector/exporter.

Runbook operativo: verificare /health/live per processo e /health/ready per DB; scrutare i counter /metrics e i
log filtrando EventName, TraceId o CorrelationId. Un readiness rosso indica indisponibilita DB senza dettagli;
verificare la connettivita MySQL lato operatore. Un sink file non scrivibile deve essere corretto sul volume/directory e
l'applicazione riavviata. Limitare /metrics alla rete di scraping nel reverse proxy/firewall.

Verifica: dotnet build backend/backend.sln --no-restore passa con 0 errori e 15 warning legacy complessivi (7 nel progetto webserver). Test di fault
injection DB, scan sentinelle, prova rolling/retention e misurazione load non sono stati eseguiti in questo step.

## PERF-51 — Query, async, cancellation e lifetime risorse

**Stato:** completato (29 settembre 2026)

**Priorità:** P2

**Obiettivo**

Ridurre query/materializzazione inutili e garantire cancellazione/cleanup, basandosi su misure.

**Situazione attuale**

Il servizio query v1 usa AsNoTracking e proiezioni DTO. L'elenco paginato esegue count e pagina; la dashboard usa una
query aggregate verificata con MySQL 8.4. CanConnectAsync è limitato al bootstrap. Baseline e misura dopo la modifica
sono raccolte su 1.000 movimenti sintetici; i risultati sono riportati nell'esito e nell'evidenza.

**Motivazione**

Migliora scalabilità senza cache o architetture aggiuntive e chiude resource leak.

**Prerequisiti**

- DAT-24;
- API-34;
- metriche OBS-50 disponibili per misurare.

**File coinvolti**

- query service/use case introdotti da API-30
- controller e `Program.cs`
- context/interceptor
- transaction/dashboard/wallet query
- test performance/cancellation.

**Istruzioni operative**

1. Acquisire baseline: query count, SQL, latenza p50/p95 su dataset definito e allocazioni per endpoint principali.
2. Applicare `AsNoTracking` e proiezioni DTO alle letture; includere solo campi necessari.
3. Riscrivere dashboard in aggregazioni traducibili server-side e ridurre round-trip mantenendo snapshot/coerenza
   documentata. Verificare SQL provider, non assumere traduzione.
4. Rimuovere `CanConnect` per request; affidarsi ad apertura query/pool e readiness separata.
5. Usare metodi EF async e propagare `HttpContext.RequestAborted`/CancellationToken fino al DB.
6. Usare `IAsyncDisposable`/scope per context, transaction, stream e archive; nessun task fire-and-forget.
7. Analizzare `EXPLAIN` e aggiungere/modificare indici in migration dedicata solo se la misura lo giustifica.
8. Load/concurrency test confronta baseline e controlla risultati, non solo velocità.

**Vincoli**

- nessuna cache distribuita o N+1 nascosto;
- nessun parallelismo simultaneo sullo stesso DbContext;
- ottimizzazione non cambia risultati legacy o `/api/v1`;
- cancellazione non lascia transazioni aperte.

**Rischi**

- proiezioni complesse non traducibili;
- query unica può essere peggiore di più query;
- indice accelera read ma rallenta write.

**Verifiche**

- query count/SQL e p50/p95 prima/dopo;
- integration test di equivalenza risultati;
- cancellazione durante query/mutazione con cleanup;
- pool/connessioni tornano alla baseline;
- `EXPLAIN` allegato per nuovi indici.

**Criteri di completamento**

- nessuna query sync nel percorso async senza motivazione;
- cancellation propagata e risorse smaltite;
- miglioramenti misurati o modifica scartata;
- risultati e atomicità invariati.


**Esito 29 settembre 2026**

- La cancellazione HTTP raggiunge i comandi EF nei percorsi legacy e v1; rollback e disposal avvengono anche dopo
  l'abort. Transazioni e context temporanei sono smaltiti async.
- Corretto il lock wallet: i valori correnti letti con FOR UPDATE aggiornano l'entità tracciata prima della mutazione,
  evitando che un context concorrente salvi una BalanceVersion obsoleta.
- La dashboard v1 è passata da tre query aggregate a una GROUP BY con SUM condizionali. Il provider MySQL 8.4 ha
  tradotto ed eseguito il SQL; i risultati di totali e categorie sono verificati sul dataset di prova.
- Dataset sintetico fisso: 1.000 movimenti, 8 warm-up, 50 campioni seriali. Prima/dopo: 3→1 query/request;
  p50 5,577→2,824 ms; p95 6,429→3,466 ms; allocazioni approssimative 124.855→74.745 byte/request.
  Le misure dipendono dall'ambiente Testcontainers e non sono un SLO di produzione.
- Suite backend completa su MySQL 8.4 effimero: 146/146; inclusi add concorrenti e test di cancellazione durante il lock,
  rollback e riuso del context. Snapshot OpenAPI legacy riallineato alla route /metrics esposta da OBS-50.
- Non sono stati cambiati indici o schema, quindi non serve EXPLAIN per una migration.
- Eccezione documentata: UserManager e SignInManager non espongono overload con CancellationToken. Le operazioni Identity
  restano awaited; gli accessi EF diretti dell'account ricevono il token. Nessun lavoro è lasciato fire-and-forget.
- Evidenza: [PERF-51 2026-09-29](../evidence/PERF-51_2026-09-29.md).

## PLT-52 — Allineamento dipendenze e .NET 10 LTS

**Stato:** non iniziato

**Priorità:** P1, per fine supporto .NET 8 imminente

**Obiettivo**

Portare runtime/framework/provider a una matrice supportata e riproducibile, senza mescolare modifiche di dominio.

**Situazione attuale**

Target `net8.0`, EOL 10 novembre 2026. Asset includono EF Core 8.0.20, componenti Microsoft.Extensions 8/9,
`MySql.EntityFrameworkCore 9.0.9` e test stack datato. Nessun SDK pin o lock NuGet.

**Motivazione**

Ricevere patch di sicurezza/supporto e ridurre incompatibilità transitive.

**Prerequisiti**

- API-34 e DB-21;
- matrice ufficiale provider/MySQL verificata sulla versione server reale;
- DEP-10 completato.

**File coinvolti**

- tutti i `backend/**/*.csproj`
- nuovo `global.json`
- eventuale `Directory.Packages.props`, `packages.lock.json`, `NuGet.Config` repository-safe
- Dockerfile backend
- solution/test/CI docs.

**Istruzioni operative**

1. Validare MySQL 8.4 LTS self-hosted contro la support matrix ufficiale corrente per .NET 10, EF Core e provider.
2. Scegliere un set coerente di versioni; evitare Microsoft.Extensions major diverso salvo dipendenza documentata.
3. Aggiungere `global.json` con SDK feature band/roll-forward approvato e gestione centrale versioni se riduce drift.
4. Aggiornare in step controllati: SDK/runtime image, target framework, EF/provider, web/OpenAPI/logging, test tooling.
   Se necessario dividere in PR, mantenendo build/test a ogni checkpoint.
5. Generare lock NuGet e usare restore locked in CI/container; documentare processo intenzionale di update.
6. Eseguire migration SQL diff: un upgrade provider non deve generare variazioni schema inattese.
7. Eseguire suite unit/integration/API, audit vulnerabilità e smoke immagini C#.
8. Misurare breaking/obsolete API e risolverle senza cambiare contratto/domain.

**Vincoli**

- niente preview package/runtime;
- nessun upgrade schema monetario/auth nello stesso step;
- provider supportato ufficialmente con MySQL reale;
- immagini e SDK allineati.

**Rischi**

- provider può cambiare SQL, mapping unsigned/decimal/date o migration;
- lock file multiprogetto richiede processo coerente;
- aggiornamento test può cambiare discovery.

**Verifiche**

- `dotnet --info`/global.json usa SDK atteso;
- restore locked, rebuild 0 errori e suite completa;
- audit NuGet senza High/Critical non accettate;
- SQL/migration diff revisionato;
- Docker build/run/health;
- performance smoke rispetto baseline.

**Criteri di completamento**

- runtime LTS supportato e set package coerente;
- provider/MySQL in matrice documentata;
- restore riproducibile e audit pulito/waiver formale;
- nessuna breaking change funzionale non pianificata.

## CI-53 — Pipeline, container hardening e release/migration workflow

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Automatizzare build, test, audit, immagini e deploy/migration con gate e rollback.

**Situazione attuale**

Nessun workflow CI. Docker multi-stage esiste, ma usa tag mobili `8.0`, root implicito, nessun healthcheck e restore non
locked. Compose non avvia MySQL; la CLI import/export deve essere bloccata e assente dal deployment.

**Motivazione**

Le garanzie costruite nelle fasi precedenti devono essere obbligatorie e ripetibili.

**Prerequisiti**

- BAK-40, OBS-50, PERF-51, PLT-52.

**File coinvolti**

- nuovi workflow `.github/workflows/**` o CI scelta in DEC-07
- `backend/*.dockerignore`, Dockerfile, `docker-compose.yml`
- solution/config test, lock files, OpenAPI snapshot
- runbook release/migration/rollback.

**Istruzioni operative**

1. Pipeline PR: restore locked, format/check, rebuild, unit test, MySQL integration/API, OpenAPI diff, package audit,
   secret scan e build immagini.
2. Separare test per categoria ma aggregare fallimenti; MySQL usa un database casuale su un server di test isolato e
   le guardie TST-01. Non aggiungere un servizio MySQL al Compose applicativo.
3. Pubblicare coverage/test result/SBOM o package inventory senza segreti; definire retention.
4. Docker: pin almeno patch/feature band o digest con processo update, utente non-root, filesystem/permessi minimi,
   healthcheck, signal/shutdown, nessun SDK nell'immagine runtime.
5. Release sulla singola istanza: backup verificato, bootstrap/migration prima del serving, app rollout,
   readiness/smoke e rollback applicazione. Le migration non reversibili usano expand/contract e recovery, non un
   finto `Down` distruttivo.
6. Impedire deploy se audit High/Critical non ha waiver con scadenza/owner.
7. Provare pipeline da clone pulito e recovery release in ambiente isolato.

**Vincoli**

- test CI non accedono servizi condivisi;
- immagini/Compose applicativi contengono il backend C# ma non MySQL;
- secret solo nel secret store CI e mai su artifact/log;
- CI scelta dipende da DEC-07, non presumere GitHub se repository remoto diverso;
- nessun deploy automatico produzione senza gate approvato.

**Rischi**

- pin digest senza automation diventa obsoleto;
- flaky integration test riduce fiducia;
- un futuro passaggio multiistanza richiederà coordinamento delle migration oggi non necessario.

**Verifiche**

- pipeline su PR pulita e PR con failure intenzionale;
- test da clone/cache vuota;
- image scan e run non-root;
- bootstrap da database assente e da schema aggiornato;
- deploy/rollback drill.

**Criteri di completamento**

- nessun merge passa senza gate concordati;
- artifact e immagini riproducibili/tracciabili;
- migration/release hanno single-run e rollback/recovery provati;
- container sono healthy e least-privilege.

## QUA-54 — Warning zero e rimozione legacy/template

**Stato:** non iniziato

**Priorità:** P3

**Obiettivo**

Eliminare warning e codice morto dopo la stabilizzazione, senza nascondere difetti con soppressioni generiche.

**Situazione attuale**

79 warning in rebuild; navigation/DTO non inizializzati; exception serialization obsoleta; variabili/using inutilizzati;
`WeatherForecast`, `UserManager`, `ExportManager`, typo nei nomi e path personale launch settings.

**Motivazione**

Un baseline pulito rende ogni nuovo warning un segnale e riduce il rumore/manutenzione.

**Prerequisiti**

- CI-53.

**File coinvolti**

- tutti i progetti backend, con commit piccoli per categoria
- `backend/.editorconfig`
- template/legacy e documentazione API.

**Istruzioni operative**

1. Raggruppare warning per codice/file; correggere nullability secondo verità del modello (`required`, initializer,
   nullable), non con `!` indiscriminato.
2. Rimuovere costruttori serialization obsoleti se non usati; non sopprimere SYSLIB globalmente.
3. Rimuovere WeatherForecast e aggiornare `webserver.http`/OpenAPI.
4. Rimuovere `UserManager`, `ExportManager`, using/package transitive accidental solo dopo `rg` consumer + build/test.
5. Correggere nomi typo in commit dedicato, conservando mapping error/API; usare compat shim solo se tipi sono consumer
   pubblici reali.
6. Rimuovere path assoluti personali da launch settings e usare env/documentazione.
7. Correggere regole `.editorconfig` malformate/typo e abilitare warning-as-errors gradualmente per codice nuovo, poi
   soluzione intera.
8. Aggiornare diagrammi/inventory e impostare CI su rebuild 0 warning.

**Vincoli**

- nessuna modifica funzionale nascosta;
- nessuna soppressione globale per raggiungere zero;
- una categoria per commit/PR facilmente revisionabile;
- non rimuovere dipendenza senza ricerca intero frontend/backend.

**Rischi**

- nullability fix può alterare serialization/schema se applicato alle entità;
- rename ampio crea conflitti e diff rumoroso.

**Verifiche**

- `dotnet build ... -t:Rebuild` 0 errori/0 warning;
- suite completa e OpenAPI diff;
- `rg` consumer dei rimossi;
- smoke Docker backend e test della guardia CLI;
- `git diff --check`.

**Criteri di completamento**

- rebuild e CI a zero warning concordati;
- template/dead code e path personale rimossi;
- warning-as-errors attivo senza soppressioni indiscriminate;
- documentazione descrive soltanto componenti esistenti.

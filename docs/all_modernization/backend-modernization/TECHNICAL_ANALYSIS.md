# Analisi tecnica del backend

Data di riferimento: 20 settembre 2026. Questa è una fotografia del repository, non la descrizione di modifiche già
realizzate.

## Metodo e livelli di evidenza

Sono stati letti tutti i file sorgente e di progetto sotto `backend/`, i test, `docker-compose.yml`,
`settings.example.json`, il contratto API e la documentazione della migrazione frontend. Sono state inoltre eseguite
una build da zero e analisi statiche di dipendenze e consumer. Non è stato letto `settings.json` e non è stato avviato
alcun test o comando capace di modificare MySQL.

Ogni rilievo usa uno dei seguenti livelli:

- **Confermato:** il comportamento deriva direttamente da un percorso eseguibile o da una configurazione presente.
- **Potenziale:** il codice permette il problema solo in determinate condizioni non verificabili dal repository, per
  esempio concorrenza reale, topologia di deployment o dati preesistenti.
- **Opportunità:** miglioramento utile, ma non correzione di un difetto dimostrato.

Severità:

- **P0:** rischio immediato di accesso cross-account, perdita/corruzione dati o esposizione di segreti.
- **P1:** correttezza, sicurezza o affidabilità importanti prima di ampliare l'uso.
- **P2:** manutenibilità, prestazioni e qualità operativa.
- **P3:** pulizia o ottimizzazione non urgente.

## Inventario

| Area | Contenuto attuale | Dimensione / note |
|---|---|---|
| `backend/database` | `MoneyGestorContext`, sei entità EF | configurazione statica; provider MySQL |
| `backend/logic` | command, autenticazione, filtri, converter, seed | dipende direttamente da `database` |
| `backend/webserver` | sette controller applicativi più template meteo | referenzia `logic` e `database` |
| `backend/ExportImportApplication` | CLI ZIP/CSV, export e restore | sostituisce l'intero database |
| `backend/TestProject` | integration test NUnit dei command | 61 test; MySQL fisso e distruttivo |
| Totale produttivo | 80 file C# | circa 3.823 righe |
| Totale test | 24 file C# | circa 2.127 righe |

La build `dotnet build backend/backend.sln --no-restore -t:Rebuild` termina con 0 errori e 79 warning. I gruppi
principali sono proprietà non nullable non inizializzate (`CS8618`), dereferenziazioni possibili (`CS8602`), variabili
di eccezione inutilizzate (`CS0168`) e costruttori di serializzazione eccezioni obsoleti (`SYSLIB0051`). Una build
incrementale può mostrare 0 warning perché non ricompila i progetti: per misurare la baseline va usato `-t:Rebuild`.

## Punti di forza da preservare

1. **Soluzione comprensibile.** Persistenza, logica, host HTTP, CLI e test sono identificabili senza reverse engineering
   complesso.
2. **Mutazioni composte in transazione.** `ExecutorManager.Execute` racchiude command, saldi e coppie di trasferimento
   in una transazione EF (`backend/logic/ExecutorManager.cs:30-50`). Questa atomicità va conservata anche cambiando il
   lifetime del contesto.
3. **Trasferimenti espliciti.** I due lati sono collegati da una relazione uno-a-uno e add/update/delete cercano di
   aggiornare entrambi i saldi.
4. **Vincoli relazionali di base.** Email, username, token e nomi di portafoglio per utente hanno indici univoci;
   cancellazioni rischiose sono generalmente `Restrict`.
5. **Password non memorizzate in chiaro.** PBKDF2-SHA256 usa salt casuale, conserva il costo nel formato del digest e
   confronta con `FixedTimeEquals` (`backend/logic/PasswordHasher.cs`). Il formato consente rehash progressivo.
6. **Token casuali crittograficamente sicuri.** `RandomNumberGenerator.Fill` produce 128 bit per il comando di login.
7. **Clock sostituibile nei test.** `IClock` e `TestClock` rendono testabile la scadenza; la destinazione dovrebbe usare
   `TimeProvider`, mantenendo lo stesso beneficio senza factory statica.
8. **Test significativi sul dominio.** I command principali hanno casi positivi, rollback, saldi, trasferimenti e
   diversi controlli cross-user. La suite è una buona base da mettere in sicurezza, non da scartare.
9. **Envelope stabile.** `{ code, message, data }` è applicato centralmente da `MoneyMenagerController` ed è già
   consumato dal frontend.
10. **Frontend protetto da adapter.** Le slice migrate hanno adapter DTO → view model; ciò permette di cambiare il
    backend con una finestra di compatibilità senza spostare logica di dominio nel client.

## Registro sintetico dei rilievi

| ID | Severità | Evidenza | Sintesi |
|---|---:|---|---|
| SEC-01 | P0 | confermato | modifica di portafoglio senza vincolo sul proprietario |
| SEC-02 | P0 | confermato | `UserId` di un movimento controllabile dal client, con criteri di lettura incoerenti |
| SEC-03 | P1 | confermato | tipo e colore referenziabili senza policy globale/personale |
| SEC-04 | P0 | confermato | sensitive logging e token in eccezioni/log di risposta |
| SEC-05 | P1 | confermato | token di sessione in chiaro, nessuna revoca/logout server e auth manuale |
| SEC-06 | P1 | confermato | PBKDF2 a 10.000 iterazioni, niente rate limit o policy server completa |
| API-01 | P1 | confermato | errori di dominio prevalentemente trasformati in 500 |
| API-02 | P1 | confermato | validazione manuale parziale e DTO/entità mescolati |
| API-03 | P1 | confermato | CORS configurato con `WithOrigins("*")`, non con una policy valida per origini reali |
| API-04 | P1 | confermato | parser filtri fragile, superficie riflessiva libera e paginazione ambigua |
| API-05 | P2 | confermato | output mutazioni incoerente e specifica OpenAPI non persistita |
| DATA-01 | P1 | confermato | importi e saldi `Double` |
| DATA-02 | P1 | potenziale | lost update sui saldi concorrenti e assenza di riconciliazione |
| DATA-03 | P1 | confermato | `EnsureCreated`, nessuna migration e seed che ignora gli errori |
| DATA-04 | P1 | confermato | semantica temporale implicita tra `DateOnly`, `DateTime` locale e query inclusive |
| DATA-05 | P1 | confermato | invarianti di trasferimento e saldo non completamente validate |
| BAK-01 | P0 | confermato | CSV non conforme e parsing dipendente dalla cultura |
| BAK-02 | P0 | confermato | replace del DB non atomico, recovery incompleto e validazione tardiva |
| BAK-03 | P1 | confermato | export non consistente/deterministico e backup contenente password hash |
| BAK-04 | P1 | confermato | errori import assorbiti, directory temporanee e operatività container incomplete |
| ARC-01 | P1 | confermato | stato statico, context creati manualmente e `ExecutorManager` non disposable |
| ARC-02 | P2 | confermato | controller accedono direttamente a EF e modelli persistenti arrivano all'API |
| REL-01 | P2 | confermato | query sync dentro flussi async e assenza di cancellation token |
| PERF-01 | P2 | confermato | letture tracked, over-fetch e dashboard multi-query/materializzata |
| OBS-01 | P2 | confermato | logging presente ma niente health check, correlazione esplicita o metriche |
| TST-01 | P0 | confermato | test distruttivi con destinazione e credenziali hard-coded |
| TST-02 | P1 | confermato | nessun test HTTP/CLI/concorrenza e difetti interni ad alcuni test |
| DEP-01 | P1 | confermato | Playwright inutilizzato introduce `System.Text.Json 6.0.5` vulnerabile |
| DEP-02 | P1 | completato (PLT-52, 30 settembre 2026) | .NET 10 LTS, EF Core 10, provider MySQL e dipendenze coerenti |
| OPS-01 | P2 | parzialmente risolto (CI-53, 30 settembre 2026) | container backend hardened e runbook manuale; pipeline remota rinviata dal proprietario |
| QUA-01 | P2 | confermato | 79 warning, codice template/legacy, naming e using inutilizzati |

## Sicurezza e isolamento fra utenti

### SEC-01 — IDOR sulla modifica del portafoglio

**Confermato, P0.** `EditWalletCommand` carica il portafoglio con il solo `Id`
(`backend/logic/Commands/Wallets/EditWalletCommand.cs:25`). Il controllo duplicati usa l'utente autenticato, ma la
mutazione viene applicata all'entità caricata anche se appartiene a un altro utente. Conoscere o indovinare l'ID è
sufficiente per modificarne nome e colore.

Da mantenere: il vincolo di unicità del nome per proprietario. Da correggere: ogni lookup mutante deve includere la
policy di ownership prima di modificare l'entità. Il test esistente `DuplicateWalletNameDifferentUser` verifica solo
che due utenti possano usare lo stesso nome; non è un test di rifiuto cross-user.

### SEC-02 — attribuzione cross-account dei movimenti

**Confermato, P0.** Il body accetta `transaction.user.id`, passato senza validazione a `AddTransactionCommand` e
`UpdateTransactionCommand`. I command assegnano quel valore a `TransactionDb.UserId`, mentre `UserInsertId` è
l'utente autenticato (`AddTransactionCommand.cs:46-54`, `UpdateTransactionCommand.cs:65`). Le letture non concordano:

- la lista filtra `UserInsertId` (`TransactionController.cs:29-45`);
- il dettaglio filtra `UserId` (`TransactionController.cs:58`);
- la dashboard filtra `UserId` (`DashboardController.cs:22`);
- delete filtra `UserInsertId` (`DeleteTransactionCommand.cs:21`).

Un utente può quindi attribuire un movimento a un altro ID utente usando un proprio portafoglio. Il movimento entra
nelle aggregazioni della vittima; la lista dell'inseritore include l'oggetto `User` convertito con nome, cognome, email
e username. Non esiste un modello di condivisione che renda legittimo il comportamento.

DEC-01 approva ownership singola: ignorare/rifiutare `user.id` in input e impostare entrambi i campi all'utente
autenticato. La condivisione richiederà un modello futuro esplicito. La bonifica dei dati già presenti deve essere
preceduta da una query diagnostica e ogni anomalia deve fermare l'operazione secondo DEC-09.

### SEC-03 — ownership di colore e tipo

**Confermato, P1.** `AddNewWalletCommand` accetta qualsiasi `ColorId` esistente; `AddTransactionCommand` e
`UpdateTransactionCommand` accettano qualsiasi `TransactionTypeId`. Le liste mostrano solo valori globali o
dell'utente, ma le mutazioni non applicano lo stesso filtro. Un ID privato indovinato può essere referenziato e poi
restituito attraverso wallet/movimenti.

La policy richiesta è: risorsa globale (`UserId == null`) oppure proprietà dell'utente corrente. Il tipo `Transfer`
richiede inoltre regole riservate e non deve essere simulabile con un tipo personale.

### SEC-04 — segreti nei log

**Confermato, P0.** `MoneyGestorContext` abilita logging EF, `EnableSensitiveDataLogging()` e detailed errors per default
(`MoneyGestorContext.cs:19`, `28`, `50-54`). `FindUserByTokenCommand` include il token nel messaggio dell'eccezione
(`:21`). `MoneyMenagerController.Response` interpola l'intero `data` nel log di debug (`:16`), quindi il token di login
può essere scritto. L'export contiene gli hash password (`Export.cs:73-79`).

La correzione immediata è disabilitare dati sensibili per default, redigere `Authorization`, non loggare payload e
usare eventi strutturati con ID/codici non sensibili. Detailed errors possono essere abilitati solo in uno sviluppo
locale intenzionale.

### SEC-05 — sessioni

**Confermato, P1.** I token opachi sono memorizzati in chiaro in `login`, inviati come valore grezzo di
`Authorization`, rinnovati a ogni richiesta e mai revocati. Non esiste endpoint logout; il frontend elimina solo un
cookie leggibile da JavaScript e con scadenza fissa di sei mesi. Il backend usa durata 2 ore o 30 giorni. Ogni action
costruisce manualmente `ExecutorManager` e chiama `LoginUser`, quindi `UseAuthorization()` non protegge nulla.

DEC-02 sostituisce il protocollo proprietario con ASP.NET Core Identity e cookie cifrato HttpOnly, protetto da
antiforgery. Gli hash password legacy vengono verificati da un hasher compatibile e aggiornati al primo login. Il
validator del token grezzo resta confinato agli endpoint legacy fino alla migrazione del frontend; JWT non è il default
per il browser. Identity consente in seguito di collegare Google o altri provider esterni.

### SEC-06 — password e abuso

**Confermato, P1 per debolezza; potenziale per abuso.** PBKDF2-SHA256 è corretto, ma 10.000 iterazioni è un costo basso
nel 2026. La registrazione non impone limiti server-side di lunghezza/formato; login e registrazione non hanno rate
limiting. Un input enorme può anche amplificare il costo di hashing.

Il formato attuale contiene il numero di iterazioni, quindi è possibile introdurre un costo configurato, rehash al
login e limiti min/max senza invalidare gli account. Il valore esatto deve essere benchmarkato sull'hardware target.

## API, contratti e validazione

### API-01 — errori e status HTTP

**Confermato, P1.** L'exception handler gestisce solo `TokenExpiatedException` e restituisce 403. `First`, vincoli EF,
permessi, not-found, filtri malformati e invarianti arrivano spesso come 500. Alcuni controller catturano eccezioni e
restituiscono sempre 400, creando semantiche diverse per lo stesso errore.

Serve un mapping centrale con almeno 400, 401, 403, 404, 409, 422 e 429. Il legacy mantiene envelope e codici storici;
la nuova `/api/v1` usa Problem Details con `code` stabile, `traceId` e field errors. Il testo tecnico non è un contratto:
il frontend localizza attraverso il codice.

### API-02 — binding e modelli

**Confermato, P1.** I modelli `logic.Models` sono sia input sia output e hanno quasi tutte le proprietà nullable. I
controller eseguono controlli manuali incompleti. `UserController.Info` restituisce `UserDb` dopo aver impostato
`Password = ""`, mantenendo il campo password e tutte le navigation property nel modello di risposta.

DTO distinti per create/update/response eliminano over-posting, rendono le obbligatorietà esplicite e impediscono di
esporre la forma EF. La validazione deve coprire lunghezze, range, email, date, importi finiti e riferimenti; le regole di
ownership restano nel use case, non negli attributi DTO.

### API-03 — CORS e HTTPS

**Confermato, P1.** `WithOrigins("*")` registra l'origine letterale `*`; non equivale ad `AllowAnyOrigin`. La policy
globale non è nominata in `UseCors`, mentre i controller hanno `[EnableCors("CorsPolicy")]`. Le origini di sviluppo e
produzione non sono configurabili. `UseHttpsRedirection` è attivo anche nel container esposto solo su HTTP 8080, senza
una policy documentata per forwarded headers/TLS termination.

Definire origini esplicite per ambiente e test CORS. In sviluppo può essere ammessa l'origine locale del frontend. In
produzione HTTPS deve avere un unico responsabile noto: reverse proxy o applicazione, con forwarded headers fidati.

### API-04 — filtri, ordinamento e paginazione

**Confermato, P1.** Il parser può indicizzare array vuoti per clausole prive di comparatore
(`ListFilter.cs:46-72`). L'ordinamento su proprietà sconosciuta può castare `IQueryable` a `IOrderedQueryable`.
`Convert.ChangeType` dipende dalla cultura. I nomi sono riflessi sulle entità EF, esponendo campi interni e join
arbitrari. `offset` significa numero pagina perché applica `Skip(offset * limit)`; moltiplicazione/cast possono
overfloware e non esiste un massimo. Senza `order`, la paginazione non è deterministica.

La destinazione è una allowlist per endpoint, valori parsati con cultura invariant, `limit` massimo, ordinamento di
fallback stabile e semantica esplicita `page` oppure `offset`. Un nuovo contratto deve convivere col vecchio durante la
migrazione frontend.

### API-05 — coerenza del risultato e OpenAPI

**Confermato, P2.** La creazione utente, tipo e movimento restituisce un ID, mentre `POST /wallet` ignora il risultato
del command e restituisce `data: null`; il client tipizza comunque il risultato come `number`. Update/delete sono
anch'essi tipizzati `number` lato client ma restituiscono `null`. Swagger è generato solo a runtime in Development e
non esistono snapshot/contract test.

La nuova `/api/v1` usa successi HTTP standard (`200`, `201 + Location`, `204`) senza envelope. Non correggere il
payload legacy senza adapter o migrazione del frontend.

## Dominio, persistenza e concorrenza

### DATA-01 — precisione monetaria

**Confermato, P1.** `WalletDb.Value`, `CurrentValue`, `TransactionDb.Value`, DTO, dashboard, command e CSV usano
`Double`. La rappresentazione binaria non garantisce somme decimali esatte. Manca una precisione/scala esplicita nello
schema generato.

DEC-04 fissa EUR, `decimal` end-to-end e `DECIMAL(19,2)` in MySQL. Valori con più di due decimali o fuori range devono
produrre l'eccezione/report DEC-09, senza rounding implicito. Servono audit, backup, conversione controllata, test di
somme ripetute e rollback provato.

### DATA-02 — saldi concorrenti

**Potenziale, P1.** `UpdateWalletCurrentValueCommand` legge `CurrentValue`, calcola in memoria e salva un valore
assoluto. Due richieste concorrenti sullo stesso wallet possono leggere lo stesso saldo e l'ultima scrittura può
perdere l'altra variazione. Non esiste token di concorrenza, update atomico o riconciliazione dal ledger.

La proposta incrementale è mantenere `CurrentValue`, introdurre concorrenza ottimistica/aggiornamento atomico con retry
limitato e un comando di sola verifica che confronti `Value + SUM(Transaction.Value)` col saldo. Passare subito a un
ledger puramente calcolato aumenterebbe il rischio e il costo delle query senza necessità dimostrata.

### DATA-03 — schema e seed

**Confermato, P1.** L'avvio chiama `EnsureCreated`, quindi non può evolvere uno schema esistente. `forceUpdate` è letto
ma ignorato. `DatabaseInitializer` apre una transazione, ma ogni helper assorbe tutte le eccezioni; l'update del tipo
globale invoca `dbContext.Update(dbContext)` invece dell'entità (`DatabaseInitializer.cs:63-77`). Gli oggetti seed sono
istanze statiche riutilizzate.

Introdurre una migration baseline verificata contro uno schema reale, quindi migration piccole. Il seed va riscritto
come upsert idempotente osservabile: un errore deve fallire startup/migration con contesto sufficiente e senza segreti.

### DATA-04 — date e tempo

**Confermato, P1.** Il controller converte il timestamp ricevuto in `DateOnly`, poi lo salva come `DateTime` a mezzanotte
senza semantica di fuso. La dashboard accetta `DateTime from/to` e usa confronti inclusivi. Sessioni e nomi file usano
`DateTime.Now`. Questo mescola data civile, istante e tempo locale.

DEC-06 approva `DateOnly`/colonna MySQL `DATE` e JSON `YYYY-MM-DD`. Sessioni, audit e timestamp operativi usano UTC; un
eventuale `occurredAt` opzionale sarà un'estensione futura e non viene simulato ora. Il frontend continua a formattare
con next-intl/Day.js.

### DATA-05 — invarianti

**Confermato, P1.** In creazione, la presenza del wallet di destinazione genera una coppia anche se il tipo non è
`Transfer`; viceversa non si richiede destinazione quando il tipo è `Transfer`. Non si vieta source = destination.
Wallet iniziali negativi sono permessi, mentre i movimenti normalmente non possono portare il saldo sotto zero. Il tipo
non viene autorizzato e mancano check constraint per invarianti strutturali.

DEC-05 consente saldi negativi e rimuove il controllo di fondi insufficienti. Restano obbligatorie le invarianti dei
trasferimenti: importo positivo, wallet distinti dello stesso owner, tipo Transfer e coppia atomica a somma zero. I
constraint DB sono difesa aggiuntiva, non sostituti delle policy di dominio.

### Modellazione EF

Aspetti da mantenere: foreign key esplicite, delete behavior prudenti e indici univoci. Aspetti da migliorare:

- gli `HasIndex(x => x.Id)` sono ridondanti rispetto alla primary key convenzionale;
- gli indici univoci con `UserId` nullable possono ammettere più righe globali con lo stesso valore in MySQL;
- mancano lunghezze massime, precisioni, charset/collation documentati e indici per query frequenti come
  `(UserId, Date)` e `(UserInsertId, Date)`;
- le navigation non nullable non sono inizializzate e generano gran parte dei warning;
- la coppia self-reference richiede test di vincoli, cancellazione e dati orfani prima di qualsiasi migration.

Non aggiungere indici per intuizione: acquisire query reali e piani `EXPLAIN` dopo aver stabilizzato il contratto.

## Architettura applicativa e risorse

### ARC-01 — lifetime e stato statico

**Confermato, P1.** Host, porta, nome, utente e password del DB sono statici in `MoneyGestorContext`. `DatabaseFactory`,
`ClockFactory` e `Settings` mantengono stato globale. `ExecutorManager` costruisce il context con `new`, non implementa
`IDisposable/IAsyncDisposable` e possiede un finalizer che lancia un'eccezione se trova una transazione aperta. I
controller non smaltiscono l'executor. `FindUserByTokenCommand` apre inoltre un secondo context fuori dalla transazione
del command chiamante.

Un'eccezione da finalizer può terminare il processo; context/connessioni vivono più del necessario; test paralleli e
configurazioni multiple sono difficili. Passare a Options + DI scoped, eliminare il finalizer e usare un solo context
per use case. `TimeProvider` sostituisce la factory statica.

### ARC-02 — confini

**Confermato, P2.** Color, wallet, transaction, dashboard e user info leggono EF direttamente dai controller. Il
progetto web referenzia quindi la persistenza e contiene query/autorizzazione. `UserManager` duplica registrazione/login
e viene usato soltanto dai test, che in parte configurano il sistema tramite un percorso diverso da quello produttivo.

I controller devono delegare a use case/query service. Non serve un repository generico: un `DbContext` scoped è
sufficiente. Command esistenti possono essere trasformati gradualmente; non occorre rinominare tutto in una volta.

### REL-01 — async, cancellazione e cleanup

**Confermato, P2.** Flussi async usano `FirstOrDefault`, `Count`, `SaveChanges` e `BeginTransaction` sincroni in vari
punti; gli action method non accettano `CancellationToken`; startup usa `.Wait()`. Query e transazioni continuano anche
se il client si disconnette. La CLI non garantisce cleanup delle directory temporanee.

Uniformare le API async e propagare il token HTTP. La CLI verrà bloccata da BAK-40; non modernizzarne i flussi.

## Import/export

### BAK-01 — formato CSV

**Confermato, P0.** L'export quota le stringhe e raddoppia le virgolette, ma `CsvReader` legge per riga e usa
`Split(',')`: virgole e newline nei campi rompono le colonne, le virgolette raddoppiate non sono decodificate. `Double`
usa la cultura corrente, per cui una virgola decimale collide con il delimitatore. `ParseCsv<String>` rimuove solo il
primo/ultimo carattere.

DEC-08 rende questo difetto non raggiungibile bloccando l'intera CLI. Non scegliere ora un nuovo formato; se la feature
verrà riaperta, il requisito dovrà distinguere backup, portabilità e tooling prima di progettare il contratto.

### BAK-02 — sostituzione distruttiva

**Confermato, P0.** `Import1_0_0` rinomina il database spostando una tabella alla volta e poi elimina lo schema
originale. Questa operazione avviene prima del blocco `try` che gestisce il caricamento. Un errore a metà del rename può
lasciare tabelle divise fra due schemi senza recovery automatico. La transazione EF copre gli insert nel nuovo DB, non
DDL e rename/drop. Il backend può restare attivo e scrivere durante l'operazione.

Prima della sostituzione servono: feature flag deny-by-default, manutenzione/lock, validazione completa in staging,
backup esterno, nome DB confermato, test di recovery e swap compatibile con le garanzie reali di MySQL. Il termine
“transazione” non deve far supporre atomicità end-to-end.

### BAK-03 — consistenza e riservatezza

**Confermato, P1.** L'export esegue più query/tabella senza snapshot e pagina con `Skip/Take` senza `OrderBy`; scritture
concorrenti possono produrre duplicati/mancanze o relazioni incoerenti. Il manifest non contiene conteggi, dimensioni,
hash, versione schema o metadati di creazione. Gli hash password sono inclusi; i login no. L'archivio è quindi un
segreto anche senza password in chiaro.

Esportare da snapshot consistente o finestra di manutenzione, ordinare per PK, aggiungere checksum e conteggi, limitare
dimensioni/righe e documentare cifratura/retention a livello operativo. Non inventare crittografia proprietaria.

### BAK-04 — errori e operatività

**Confermato, P1.** `ImportManager` cattura l'eccezione e non la rilancia: il processo può terminare con exit code 0 dopo
un fallimento. Le directory temp non sono eliminate. Manifest incompleti producono tabelle vuote invece di un errore.
I path del manifest non sono vincolati esplicitamente alla cartella estratta. Il servizio Compose non monta una
directory per gli ZIP e non ha conferma/dry-run.

BAK-40 deve far terminare ogni comando con codice non zero prima di leggere settings, aprire MySQL o toccare archivi.
Non esiste un flag di riabilitazione: la riapertura richiede una nuova decisione e un redesign.

## Prestazioni e scalabilità

### PERF-01 — query

**Confermato, P2 per inefficienza; impatto non misurato.** Le letture usano tracking anche quando non mutano dati.
Transaction list include interi grafi di wallet/color/user. Dashboard esegue quattro query e materializza gruppi prima
della proiezione finale. `DatabaseFactory.Use` chiama `CanConnect` per ogni context. La scadenza sessione viene scritta
a ogni richiesta autenticata, aumentando contesa e write load.

Interventi dopo i fix di correttezza:

- proiezioni DTO server-side e `AsNoTracking` per letture;
- dashboard aggregata in query traducibili e testata con dataset realistico;
- eliminazione del `CanConnect` per richiesta;
- rinnovo sessione con soglia, non a ogni chiamata;
- indici guidati da query/piani;
- limiti di pagina e payload.

Non introdurre cache distribuita finché metriche e carico non ne dimostrano il bisogno. Il sistema attuale non ha una
scala osservata che giustifichi Redis o microservizi.

### Topologia a singola istanza

DEC-07 approva una sola istanza backend con MySQL 8.4 LTS self-hosted ed esterno. Il bootstrap applicativo può creare il
database assente e applicare migration prima del serving quando abilitato; non serve un lock distribuito. Rate limiter
e coordinamento possono essere locali, documentando che un futuro passaggio multiistanza richiederà una nuova scelta.
Compose può avviare il backend C#, ma non include MySQL.

## Error handling, logging e osservabilità

Serilog e request logging sono una buona base. Mancano però:

- redazione centralizzata di header/payload sensibili;
- correlation/trace ID restituito e incluso nei log;
- eventi di dominio/operativi stabili per login, rifiuti auth, bootstrap/migration e riconciliazione;
- health check distinti per liveness/readiness;
- metriche su latenza, error rate, connessioni/query e login falliti;
- livelli, sink, path, rolling, size e retention gestiti da file di configurazione;
- startup/shutdown robusti: `Environment.Exit`, `.Wait()` e catch vuoti impediscono gestione uniforme.

OpenTelemetry è un'opportunità, non un prerequisito. Prima servono log sicuri, health check e metriche minime; exporter
e backend osservabilità dipendono dall'ambiente scelto.

## Test e testabilità

### TST-01 — destinazione distruttiva

**Confermato, P0.** `DatabaseFactory.InTest` imposta `localhost:1883`, database `ut_money_gestor`, utente `unit_test` e
password nel codice. `DatabaseBase` esegue `EnsureDeletedAsync` nel teardown e molte fixture cancellano tabelle con
`ExecuteDeleteAsync`. Non c'è guardia su ambiente, prefisso casuale o server dedicato.

Prima di avviare la suite, introdurre un MySQL effimero per run, nome casuale e guardie multiple. La suite deve rifiutare
host/database non consentiti. Il teardown deve eliminare solo il database creato dal run corrente.

### TST-02 — copertura e qualità interna

**Confermato, P1.** Sono presenti 61 `[Test]`, ma:

- non esistono test del pipeline HTTP, binding, status, CORS, auth handler o JSON;
- non esiste un test che provi il blocco fail-closed della CLI prima di settings/DB/filesystem;
- non esistono test concorrenza saldi, migration o compatibilità schema;
- almeno un test wallet è esplicitamente inconcludente; una seconda chiamata `Assert.Inconclusive` è nel helper login;
- `CorrectInsert_NegativeValue` costruisce `negativeTransaction` ma esegue `transaction.AddTransactionCommand`, quindi
  non verifica il caso dichiarato (`AddTransactionTest.cs:70-93`);
- alcune query test correlano ID di transaction e wallet in modo fragile (`AddTransactionTest.cs:66`);
- `UserManager`, duplicato legacy non usato dall'host, è usato dai test base;
- il database e le factory statiche ostacolano esecuzione parallela e isolamento.

La strategia deve distinguere unit test di policy pure, integration test con MySQL reale e API test con
`WebApplicationFactory`. Non sostituire completamente MySQL con provider in-memory: non verificherebbe precisioni,
indici, transazioni e semantiche del provider.

## Dipendenze e runtime

### DEP-01 — vulnerabilità transitiva

**Confermato, P1.** `Microsoft.Playwright.NUnit 1.27.1` è dichiarato nel progetto test ma non ha consumer nel sorgente.
Porta `System.Text.Json 6.0.5`; la pagina NuGet ufficiale segnala almeno una vulnerabilità High e deprecazione. La
correzione minima è rimuovere Playwright dal progetto backend dopo una ricerca consumer e rieseguire restore/audit.
Non serve aggiornarlo se non ci sono test browser backend.

Il comando `dotnet list package --vulnerable` non è stato completato nell'ambiente isolato perché non poteva leggere il
`NuGet.Config` del profilo. Questo limite va registrato come verifica non eseguita, non interpretato come assenza di
altre vulnerabilità.

### DEP-02 — supporto e allineamento

**Risolto il 30 settembre 2026 con PLT-52.** Il target è `net10.0`; EF Core/Identity 10.0.12 e provider Oracle
`MySql.EntityFrameworkCore 10.0.9` usano Connector/NET 26.7.0. Serilog.AspNetCore 10.0.0 e Swashbuckle 10.2.3
sono allineati. SDK e versioni pacchetti sono centralizzati e i restore sono bloccati. Il confronto degli script migration
per entrambi i DbContext ha confermato nessuna variazione DDL. Vedere [evidenza PLT-52](evidence/PLT-52_2026-09-30.md).
## Configurazione, Docker e deployment

Aspetti positivi: `settings.json` è ignorato, l'esempio usa un placeholder e i container montano la configurazione
read-only. Criticità:

- il parser web è manuale, statico e usa default pericolosi (`root`/`root`) se mancano campi;
- il parser web e quello CLI sono due implementazioni diverse dello stesso schema;
- `forceUpdate` non ha effetto;
- `launchSettings.json` della CLI conteneva un path assoluto personale (rimosso con QUA-54);
- Docker backend ora usa digest multi-platform fissati, healthcheck e utente non-root; Compose applica filesystem read-only e capability drop; il frontend attende backend healthy.
- Compose non avvia MySQL per scelta; il deployment single-instance e documentato, la CI remota e rinviata e non c'e gate automatico di merge.
- la CLI container non monta una directory backup;
- Non esiste una pipeline CI remota; il release/migration workflow single-instance manuale e in RELEASE_RUNBOOK.md.
- PLT-52 ha introdotto global.json, central package management e lock NuGet.

La modernizzazione non deve imporre Kubernetes, cloud secret manager o database gestito senza requisiti. Deve però
separare configurazione non sensibile da segreti, validare all'avvio e documentare in modo deterministico la topologia
scelta.

## Qualità del codice e manutenibilità

La lista seguente registra la baseline storica. QUA-54 ha eliminato i typo elencati, WeatherForecast, ExportManager, i costruttori serialization obsoleti e i warning di compilazione. Il UserManager personalizzato era già stato rimosso; le istanze ASP.NET Identity sono ancora in uso. Le voci residue richiedono interventi distinti:

- campi mutabili che possono essere `readonly`;
- catch con variabili inutilizzate o catch vuoti;
- magic ID `1/2` per tipi globali e stringhe di messaggio usate per decidere il codice errore;
- convenzioni asincrone/naming incoerenti.

Pulire in step separati dopo la rete di sicurezza. Rinominare tipi pubblici può generare diff ampi e non deve essere
mescolato a fix funzionali.

## Valutazione per area richiesta

| Area | Da mantenere | Da migliorare/sostituire | Rischio della modifica |
|---|---|---|---|
| Architettura | progetti e command leggibili | DI, boundary applicativo, context scoped | regressioni transazionali/lifetime |
| API | adapter legacy durante transizione | nuova `/api/v1`, DTO, Problem Details, OpenAPI | rottura frontend |
| Business logic | command e atomicità trasferimenti | policy ownership/invarianti centralizzate | variazione semantica dati esistenti |
| Database | relazioni e vincoli base | migration, decimal, date, indici misurati | conversione dati/rollback |
| Errori | handler centrale già registrato | copertura completa e status corretti | client legacy basato sui codici |
| Logging | Serilog e request logging | redazione, config file, correlazione, health/metriche | perdita diagnostica se eccessivamente ridotto |
| Sicurezza | formato hash legacy verificabile | Identity cookie, antiforgery, verifica email, rate limit, ownership | invalidazione sessioni |
| Prestazioni | query EF traducibili | proiezioni, no-tracking, limiti, concorrenza | query provider-specific |
| Async | uso diffuso di Task/Async | eliminare sync-over-async e propagare CT | cleanup parziale se non testato |
| Test | molti integration test di command | DB isolato, HTTP/Identity/concorrenza e guardia CLI | falsi positivi durante migrazione harness |
| Dipendenze | package reference espliciti | vulnerabilità, allineamento .NET 10 | incompatibilità provider MySQL |
| Docker | multi-stage e config read-only | health, non-root, pinning; solo app C#, MySQL esterno | permessi filesystem/rete |

## Interventi esplicitamente non raccomandati ora

- riscrivere il backend o cambiare linguaggio;
- separare utenti, wallet e movimenti in microservizi;
- aggiungere message broker, distributed cache o event sourcing;
- adottare JWT solo perché comune: il browser usa il cookie Identity approvato;
- introdurre repository generici sopra EF Core;
- passare a NoSQL;
- calcolare ogni saldo da zero a ogni richiesta prima di avere misure e indici;
- aggiornare simultaneamente .NET, provider EF, schema monetario e contratto HTTP;
- modernizzare o riabilitare import/export senza una nuova decisione di prodotto;
- eseguire i test correnti contro un MySQL non creato appositamente per il singolo run.

Queste opzioni potranno essere rivalutate solo in presenza di un requisito o una misura che ne giustifichi il costo.

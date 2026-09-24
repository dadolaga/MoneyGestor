# Audit tecnico e roadmap

Data della ricognizione: 10 settembre 2026.

## Esito sintetico

Il progetto ha una separazione leggibile tra persistenza, logica, API e UI. La modellazione dei trasferimenti e l'uso di transazioni applicative mostrano una buona base. Prima di ampliare le funzionalità, conviene però chiudere alcuni rischi che possono compromettere isolamento tra utenti, backup e precisione economica.

> Nota di pianificazione: questo documento resta la fotografia dei rischi al 10 settembre 2026. Il proprietario ha scelto di affrontare ora la migrazione frontend e di rinviare il backend. Per il workstream corrente fanno fede [FRONTEND_MIGRATION_PLAN.md](FRONTEND_MIGRATION_PLAN.md), [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) e [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md); le priorità backend sotto riportate restano aperte e non vanno risolte incidentalmente nella UI.

> Aggiornamento del 21 settembre 2026: la Fase 0 backend ha sostituito la destinazione test fissa con MySQL 8.4
> effimero tramite Testcontainers, aggiunto test HTTP e guardie distruttive, rimosso Playwright dal progetto backend e
> chiuso l'advisory transitivo noto. Le righe storiche sotto restano invariate come fotografia dell'audit originario;
> per lo stato corrente vedere la [roadmap backend](backend-modernization/ROADMAP.md).

> Aggiornamento del 22 settembre 2026: SEC-10 ha rimosso il sensitive-data logging EF, i token dalle eccezioni e i
> payload dai log delle risposte. TRACE conserva dettaglio tecnico senza password, token, header, body o valori dei
> parametri SQL; gli eventi EF sono inoltre limitati a `Development`. La sezione SEC-02 sotto resta storica.

> Aggiornamento del 23 settembre 2026: SEC-11..13 hanno centralizzato la policy owner/global per wallet, colori e tipi,
> uniformato l'owner dei movimenti al principal autenticato, eliminato i profili utente dai payload dei movimenti e
> introdotto un preflight read-only bloccante. I saldi negativi sono ora ammessi; i trasferimenti richiedono wallet
> distinti dello stesso owner e una coppia reciproca a somma zero. Le sezioni storiche su questi rischi restano come
> fotografia dell'audit originario. I tre step sono completati e verificati nell'[evidenza dedicata](backend-modernization/evidence/SEC-11_SEC-12_SEC-13_2026-09-23.md).

> Aggiornamento del 23 settembre 2026: SEC-14/15 hanno introdotto Identity con mapping stabile agli ID storici,
> rehash progressivo, cookie HttpOnly, antiforgery, CORS credentialed configurato, logout/revoca, registrazione con
> verifica email, recupero password, lockout e rate limit anti-enumeration. Il frontend non conserva più token di
> autenticazione leggibili da JavaScript. Le sezioni storiche su sessioni e cookie restano la fotografia iniziale;
> vedere l'[evidenza SEC-14/15](backend-modernization/evidence/SEC-14_SEC-15_2026-09-23.md).

> Aggiornamento del 24 settembre 2026: ARC-20 ha eliminato configurazione database e clock globali, factory e finalizer
> legacy. I context applicativo e Identity sono scoped e configurati tramite options tipizzate validate; sessione,
> command e letture della singola request condividono la stessa unit of work. Lo startup non usa più attese sincrone.
> La sezione storica su stato statico resta la fotografia iniziale; vedere
> l'[evidenza ARC-20](backend-modernization/evidence/ARC-20_2026-09-24.md).

Ordine consigliato:

1. autorizzazione e protezione dei dati;
2. affidabilità import/export;
3. importi monetari e contratto API;
4. stabilizzazione del client HTTP e dei form;
5. completamento della pagina mobile;
6. CI, test isolati e pulizia tecnica.

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| `dotnet build backend/backend.sln --no-restore` | passa, 0 errori e 79 warning |
| `npm run typecheck` | passa |
| `npm run lint` | fallisce: 10 errori nella pagina mobile, più warning sugli hook e tipi `any` |
| `npm run build` | fallisce durante il download di Inter da Google Fonts per `UNABLE_TO_VERIFY_LEAF_SIGNATURE` |
| audit NuGet | una vulnerabilità transitiva High: `System.Text.Json 6.0.5`, introdotta dal vecchio Playwright del progetto test |
| audit npm | non completato per lo stesso problema di certificato TLS |
| test NUnit | non eseguiti: la suite elimina `ut_money_gestor` su `localhost:1883` |
| `docker compose config --quiet` | passa |

Nel working tree erano già presenti modifiche frontend e a `launchSettings.json`; non sono state alterate da questa ricognizione.

## Priorità 0: prima di dati reali o multiutente

### SEC-01 — modifica wallet senza verifica del proprietario

`EditWalletCommand` carica il wallet usando solo l'ID. Un utente autenticato può quindi modificare nome o colore di un wallet altrui conoscendone l'ID. La query deve includere `UserId == executorManager.UserId`, con un test esplicito cross-user.

Riferimento: `backend/logic/Commands/Wallets/EditWalletCommand.cs:28`.

### SEC-02 — logging EF con dati sensibili in produzione

`MoneyGestorContext.Initialize` abilita il logging per default e `EnableSensitiveDataLogging()` include valori dei parametri SQL. Login e token vengono interrogati tramite EF; password hash, token e dati finanziari possono quindi finire nei log.

Riferimenti: `backend/database/MoneyGestorContext.cs:28`, `backend/database/MoneyGestorContext.cs:53`.

Disabilitare i dati sensibili per default e consentirli solo in uno sviluppo locale intenzionale.

### DATA-01 — export CSV non robusto

L'export racchiude le stringhe tra virgolette, ma l'import usa `line.Split(',')`. Una descrizione, un nome o un campo contenente virgole produce colonne errate; le virgolette raddoppiate non vengono decodificate. Inoltre `Double.ToString()` e `Double.Parse()` dipendono dalla cultura: con locale italiano la virgola decimale collide con il delimitatore CSV.

Riferimenti: `backend/ExportImportApplication/CsvReader.cs:28`, `backend/ExportImportApplication/Utils/CsvUtils.cs:24`, `backend/ExportImportApplication/Utils/CsvUtils.cs:59`.

Usare una libreria CSV collaudata e cultura invariant, poi aggiungere un test round-trip con virgole, virgolette, accenti, newline e decimali.

### DATA-02 — import distruttivo senza barriera operativa sufficiente

L'import rinomina/sposta le tabelle del database corrente, crea il nuovo database e infine elimina il backup temporaneo. È un flusso ad alto impatto, non una singola transazione atomica MySQL. Mancano conferma esplicita, verifica preventiva dell'archivio, checksum e dry-run.

Riferimento: `backend/ExportImportApplication/Imports/Import1_0_0.cs`.

Prima di usarlo in produzione: validazione completa in staging, backup esterno, conferma con nome database, lock applicativo e piano di recovery testato.

## Priorità 1: correttezza e sicurezza applicativa

### Autorizzazione incoerente

- La creazione di una transazione verifica i wallet, ma non controlla che il tipo appartenga all'utente o sia globale.
- Il client può inviare `transaction.user.id` senza una regola di condivisione esplicita.
- Lista, dettaglio e dashboard filtrano in modo diverso tra `UserId` e `UserInsertId`.
- L'update carica inizialmente la transazione per solo ID; alcune verifiche indirette sui wallet limitano l'impatto, ma l'autorizzazione dovrebbe essere diretta e uniforme.

Riferimenti: `AddTransactionCommand.cs`, `UpdateTransactionCommand.cs`, `TransactionController.cs`, `DashboardController.cs`.

Definire prima il modello: “ogni dato appartiene a un solo utente” oppure “utenti condividono wallet/transazioni”. Poi centralizzare policy e query.

### Sessioni e cookie

- Token memorizzati in chiaro nel database.
- Nessun endpoint di logout/revoca; il logout frontend rimuove solo il cookie.
- Cookie accessibile da JavaScript e privo di impostazioni esplicite `Secure`/`SameSite`.
- Il cookie dura sei mesi anche se il token server dura due ore o trenta giorni.
- Il token viene incluso nel testo di un'eccezione quando non è trovato.

Riferimenti: `FindUserByTokenCommand.cs`, `LoginCommand.cs`, `frontend/src/app/dashboard/user/login/page.tsx`.

### Password

PBKDF2-SHA256 è una scelta valida, ma 10.000 iterazioni è un costo oggi troppo basso. Rendere il parametro aggiornabile e prevedere rehash al login. Aggiungere limiti di lunghezza, rate limiting e policy server-side: oggi i controlli forti vivono solo nel frontend.

### Importi monetari in `Double`

Wallet, transazioni e dashboard usano `Double`. Gli errori binari di arrotondamento sono inadatti a saldi finanziari. Migrare con attenzione a `decimal` e a colonne MySQL `DECIMAL(precision, scale)`, includendo test su somme ripetute e conversione dati.

### Eccezioni e status HTTP

L'handler globale traduce solo il token scaduto. Oggetti mancanti, permessi negati, vincoli di cancellazione e input malformati possono produrre 500. Creare una mappatura centrale coerente (400/401/403/404/409/422) mantenendo, se serve, i codici applicativi.

### CORS e HTTPS

La policy usa `WithOrigins("*")`, che non equivale a `AllowAnyOrigin`, e il middleware globale non indica il nome della policy. Le annotazioni controller rendono il comportamento meno evidente. Definire origini esplicite da configurazione per produzione. Verificare inoltre `UseHttpsRedirection` dietro il mapping Docker solo HTTP.

## Import/export e integrità dei dati

Oltre a `DATA-01` e `DATA-02`:

- gli archivi includono hash password e devono essere trattati come segreti;
- le directory temporanee di export/import non vengono eliminate;
- l'export non impone un ordinamento stabile prima di `Skip/Take`;
- il profilo Docker della CLI non monta una directory per leggere/scrivere gli ZIP, quindi un export resta nel filesystem effimero del container;
- il README precedente indicava il servizio `exportimport`, mentre il Compose lo chiama `importexport`;
- non esistono test automatici round-trip della CLI.

## Database e startup

- `EnsureCreated()` non fornisce una strategia di migrazione dello schema.
- `forceUpdate` viene letto ma non usato.
- `DatabaseInitializer` ignora tutte le eccezioni durante il seed.
- Nell'update di un tipo globale viene chiamato `dbContext.Update(dbContext)` invece di aggiornare l'entità; l'eccezione può essere poi silenziata.
- Stato della connessione e configurazione sono statici, rendendo più difficile isolamento e parallelismo dei test.
- Molte navigation property non nullable generano warning: sono 79 warning complessivi nella build corrente.

Direzione: dependency injection per `DbContext`, migration EF versionate, seed idempotente osservabile e warning nullable ridotti a zero progressivamente.

## API, filtri e paginazione

- `offset` viene interpretato come numero pagina (`Skip(offset * limit)`), non come offset: rinominarlo o correggere il significato nel contratto.
- Filtri malformati possono causare accessi fuori indice nel parser.
- Proprietà sconosciute vengono talvolta ignorate; il primo ordinamento sconosciuto può causare un cast non valido.
- Limiti molto grandi possono causare overflow nella conversione a `Int32` o query costose.
- Manca una specifica OpenAPI persistita/versionata e non ci sono test HTTP dei controller.
- `WeatherForecastController` è codice template ancora esposto.

## Frontend

### Problemi funzionali osservati

- `DeleteDialog` non visualizza il messaggio quando `deleteMessage` è una funzione.
- La tabella wallet cambia l'icona di ordinamento ma non ordina i dati.
- Il colore riga wallet concatena un oggetto a `#`, producendo uno stile non valido.
- Il form transazione desktop tratta il valore di un input testuale come `number` con un cast solo statico; serve una conversione runtime.
- Il segno della transazione nella UI mobile/desktop è incompleto: in un caso lo stato non modifica il valore inviato, nell'altro il pulsante non ha handler.
- Il checkbox “Ricordami” usa la presenza del campo come stato: dopo il primo click può restare visivamente/semanticamente attivo anche quando dovrebbe essere falso.
- La durata del cookie non segue la durata scelta sul server.
- Il login riuscito non esegue una navigazione esplicita.
- Il filtro data delle transazioni raccoglie lo stato ma non lo invia al backend.
- Il calcolo del saving rate non gestisce entrate pari a zero.

### Struttura da consolidare

`useApi()` restituisce un nuovo oggetto a ogni render. Molti callback omettono le dipendenze API per evitare loop e generano warning `exhaustive-deps`. Stabilizzare il client e far restituire Promise reali alle richieste semplificherebbe loading, errori, cancellazione e test.

La pagina `/dashboard/transaction/add_mobile` è chiaramente in lavorazione: il type-check passa, ma il lint segnala 10 errori tra import type, ordine import e stato inutilizzato. Non va completata come seconda implementazione autonoma: il piano di migrazione la assorbe nel Quick Add responsive condiviso, sviluppato con fixture e adapter senza vincolarlo ora al backend.

### Build riproducibile

`next/font/google` scarica Inter durante la build. Nell'ambiente corrente il certificato non è verificabile e la build fallisce. Per ambienti aziendali/offline è preferibile includere il font localmente con `next/font/local`, oppure correggere la CA del runtime di build senza disabilitare la verifica TLS.

## Test e delivery

- I test backend sono integration test legati a host, porta, utente e password hard-coded.
- Il teardown elimina l'intero database; manca una guardia che verifichi nome e ambiente.
- Non risultano test frontend.
- Non risultano workflow CI in `.github`.
- Playwright `1.27.1` porta transitivamente `System.Text.Json 6.0.5`, segnalato con gravità High.
- L'audit npm non è stato completato a causa della catena TLS locale.

Creare un MySQL effimero per test (container dedicato con nome casuale), separare unit e integration test, aggiungere test API e frontend essenziali, quindi introdurre una pipeline che esegua build, lint e test.

## Roadmap proposta

### Fase 1 — hardening

- Correggere l'IDOR sui wallet e aggiungere test cross-user a tutte le mutazioni.
- Disattivare sensitive logging e rimuovere token da messaggi/log.
- Bloccare temporaneamente l'import in ambienti non esplicitamente abilitati.
- Rendere sicura la destinazione dei test.

### Fase 2 — integrità

- Migrare gli importi a `decimal`.
- Sostituire il parser CSV e aggiungere test round-trip.
- Introdurre migration EF e un seed osservabile.
- Formalizzare ownership e condivisione.

### Fase 3 — contratto e frontend

- Uniformare errori HTTP, autenticazione e DTO validati.
- Stabilizzare `useApi`, form e gestione sessione.
- Correggere i bug condivisi prima di completare la pagina mobile.
- Aggiungere una specifica API versionata.

### Fase 4 — automazione

- Aggiornare dipendenze vulnerabili/obsolete.
- Aggiungere test frontend e controller.
- Rendere le build indipendenti da download runtime non controllati.
- Aggiungere CI con build, lint, test e audit dipendenze.

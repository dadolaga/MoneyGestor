# Fase 2 — persistenza e correttezza economica

Obiettivo della fase: eliminare stato globale, introdurre evolution dello schema verificabile e rendere importi/saldi
corretti anche con richieste concorrenti. Ogni migration richiede copia di dati, backup e recovery provato.

## ARC-20 — Options, dependency injection e `DbContext` scoped

**Stato:** completato il 24 settembre 2026

**Evidenza:** [ARC-20 — Options, DI e DbContext scoped](../evidence/ARC-20_2026-09-24.md)

**Priorità:** P1

**Obiettivo**

Usare un solo `MoneyGestorContext` scoped per use case/request, configurato con DI, e rimuovere factory/stato statici.

**Situazione precedente**

`MoneyGestorContext.Initialize`, `Settings`, `DatabaseFactory` e `ClockFactory` sono statici. `ExecutorManager` crea un
context, non lo smaltisce e ha un finalizer che può lanciare. `FindUserByTokenCommand` usa un secondo context. Startup
chiama `.Wait()`.

**Motivazione**

Lifetime esplicito abilita test isolati, transazioni reali, pooling controllato, cancellation e configurazione validata.

**Prerequisiti**

- SEC-10;
- TST-02.

**File coinvolti**

- `backend/database/MoneyGestorContext.cs`
- `backend/logic/DatabaseFactory.cs`
- `backend/logic/Clock/**`
- `backend/logic/ExecutorManager.cs`
- `backend/logic/Commands/**`
- `backend/webserver/Settings.cs`
- `backend/webserver/Program.cs`
- `backend/webserver/Controllers/**`
- test fixture/base.

**Istruzioni operative**

1. Definire options condivise per database e logging, bindarle da configurazione/env e validarle all'avvio. Campi
   mancanti devono fallire; rimuovere default `root/root`. Non stampare valori sensibili.
2. Aggiungere costruttore `MoneyGestorContext(DbContextOptions<MoneyGestorContext>)`; spostare provider/logging nella
   registrazione DI. Eliminare static host/user/password e `Environment.Exit` dal context.
3. Registrare context scoped; valutare pooling solo dopo test che nessuno stato per-request resta nel context.
4. Iniettare context in `ExecutorManager`/use case. Conservare una sola transazione per mutazione composta e usare lo
   stesso context per risoluzione sessione.
5. Eliminare il finalizer; implementare lifetime deterministico oppure rimuovere ownership del context dall'executor.
6. Sostituire `ClockFactory` con `TimeProvider` iniettato; nei test usare un provider controllabile.
7. Migrare i controller gradualmente, mantenendo adapter temporanei se serve; la CLI resta bloccata da BAK-40 e non è
   un consumer da modernizzare. Rimuovere `DatabaseFactory` solo dopo `rg` senza consumer runtime autorizzati.
8. Rendere startup `async Task Main`/startup hook asincrono senza `.Wait()`.

**Vincoli**

- ogni command multi-save resta atomico;
- nessun repository generico aggiunto;
- la CLI disabilitata non può forzare il mantenimento di factory/statici nel runtime web;
- test non riacquistano global statici.

**Rischi**

- lifetime sbagliato può usare context disposed o condiviso fra thread;
- spostare auth nello stesso context cambia timing della scadenza sessione;
- refactoring ampio: migrare una catena verticale per volta mantenendo compilazione.

**Verifiche**

- test unit/integration/API con provider MySQL effimero;
- due request concorrenti non condividono context;
- una mutazione usa un solo context/transaction, verificato con interceptor/test;
- `rg` senza `new MoneyGestorContext`, `Initialize`, `DatabaseFactory`, `ClockFactory` fuori composition/test approvati;
- shutdown non produce eccezioni finalizer o leak connessioni.

**Criteri di completamento**

- context e TimeProvider sono iniettati;
- configurazione è tipizzata e validata;
- nessun secret/default pericoloso o stato DB statico;
- atomicità command preservata e testata;
- factory/finalizer legacy rimossi senza consumer.

## DB-21 — Bootstrap da zero, migration baseline e seed osservabile

**Stato:** completato il 24 settembre 2026

**Evidenza:** [DB-21 — Bootstrap, baseline e seed osservabile](../evidence/DB-21_2026-09-24.md)

**Priorità:** P1

**Obiettivo**

Permettere alla singola istanza applicativa di creare un database assente, applicare migration EF versionate e
completare un seed idempotente/fail-fast prima di accettare traffico.

**Situazione precedente**

L'host usa `EnsureCreated`; non esiste cartella migrations. `forceUpdate` è inutilizzato. Il seed ingoia eccezioni e
aggiorna `dbContext` al posto del tipo globale.

**Motivazione**

Ogni modifica schema futura (sessioni, decimal, date, concorrenza) richiede un percorso ripetibile per DB nuovi ed
esistenti.

**Prerequisiti**

- ARC-20;
- MySQL 8.4 LTS self-hosted raggiungibile e matrice provider verificata.

**File coinvolti**

- `backend/database/MoneyGestorContext.cs`
- `backend/database/Models/**`
- nuovo `backend/database/Migrations/**`
- `backend/logic/DatabaseInitializer.cs`
- `backend/webserver/Program.cs`
- `settings.example.json`
- test migration/bootstrap;
- documentazione deployment.

**Istruzioni operative**

1. Estrarre schema reale da una copia rappresentativa e confrontarlo con il modello EF: tipi, unsigned, nullability,
   FK, delete behavior, indici, collation e auto-increment.
2. Generare una migration iniziale capace di creare da zero lo schema corrente. Revisionare il SQL MySQL generato.
3. Creare un processo di adozione per DB esistenti: preflight confronta la struttura; solo se equivalente inserisce la
   migration nella history. Non eseguire `CREATE TABLE` su schema esistente e non marcare baseline se differisce.
4. Provare entrambi i percorsi: database vuoto e copia esistente. Conservare output/diff senza dati sensibili.
5. Rimuovere `EnsureCreated`. Aggiungere un bootstrap esplicito e configurabile che, prima del serving, crea il database
   se assente e applica le migration. Il default e il flag per ambiente devono essere documentati; ogni failure ferma
   l'host con errore sicuro. Con una sola istanza non serve un lock distribuito, ma il processo resta idempotente.
6. Riscrivere seed globale come upsert idempotente con entità nuove per context. Correggere update del tipo; un errore
   deve rollbackare e fermare l'operazione con log sicuro.
7. Eliminare o dare semantica esplicita a `forceUpdate`; non lasciarlo inert.
8. Aggiungere test migration forward, creazione da server con database assente, adozione baseline, seed ripetuto,
   bootstrap disabilitato e rollback su errore.

**Vincoli**

- baseline non deve cambiare dati/schema effettivo;
- bootstrap/migration sempre governato da configurazione validata e osservabile;
- ID e nomi dei seed globali restano compatibili;
- backup/recovery provati prima dell'adozione reale.

**Rischi**

- il modello EF può non corrispondere allo schema creato storicamente;
- marcare una baseline errata rende pericolose le migration successive;
- seed con ID espliciti può interagire con auto-increment.

**Verifiche**

- SQL migration revisionato e applicato su MySQL supportato;
- schema nuovo e schema adottato confrontati;
- `database update` ripetuto è no-op;
- seed ripetuto non duplica e riflette nomi/valori approvati;
- failure injection lascia history/schema coerenti;
- test rollback/recovery da backup.

**Criteri di completamento**

- migration baseline crea schema nuovo e adotta solo schema equivalente;
- `EnsureCreated` non è nel runtime normale;
- seed non nasconde eccezioni ed è idempotente;
- bootstrap da zero, deployment migration e rollback/recovery sono documentati.

## DAT-22 — Migrazione monetaria a `decimal`

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Eliminare `Double` da tutti i valori monetari e convertire lo schema senza perdita non approvata.

**Situazione attuale**

Wallet, movimenti, dashboard, command, DTO e CSV usano `Double`; lo schema non dichiara precisione/scala.

**Motivazione**

La rappresentazione binaria e somme ripetute non sono adeguate a saldi finanziari.

**Prerequisiti**

- DEC-04 e DEC-09;
- DB-21;
- SEC-13.

**File coinvolti**

- `backend/database/Models/WalletDb.cs`, `TransactionDb.cs`, mapping context
- tutti i command/modelli/converter con `Double`
- `backend/webserver/Models/DashboardOutput.cs`
- controller dashboard/transaction/wallet
- frontend DTO/adapter interessati solo nella slice coordinata
- migration e test.

**Istruzioni operative**

1. Eseguire preflight read-only: min/max, cifre decimali, non-finiti se rappresentabili, differenze saldo-ledger e valori
   non rappresentabili in `DECIMAL(19,2)`. Su qualunque anomalia sollevare l'eccezione/report DEC-09 e fermarsi.
2. Preparare backup e prova restore. Generare SQL migration su copia e misurare lock/durata.
3. Usare strategia expand/validate/contract: colonne `DECIMAL(19,2)` temporanee o conversione controllata con check;
   vietare rounding implicito e confrontare riga per riga.
4. Cambiare .NET a `decimal` end-to-end, incluse aggregazioni, command e DTO. Vietare conversioni
   intermedie a `double`.
5. Validare JSON numerico e range JavaScript col frontend; mantenere formattazione locale nel client.
6. Rendere nuove colonne non-null con precisione/scala, poi rimuovere vecchie colonne soltanto in una release successiva
   dopo verifica. Se non è possibile dual-run, usare finestra manutenzione documentata.
7. Aggiungere test: `0.1 + 0.2`, somme ripetute, estremi, rifiuto di più di due decimali, valori negativi,
   saldo/trasferimento e dashboard.

**Vincoli**

- nessun valore viene arrotondato o scartato: le anomalie producono eccezione/report DEC-09;
- JSON non contiene stringhe localizzate;
- migration separata dall'upgrade .NET/provider;
- rollback/recovery disponibile finché le colonne vecchie non sono rimosse.

**Rischi**

- ALTER può bloccare tabelle o cambiare valori;
- precisione eccessiva può superare range JS/client;
- client legacy può richiedere un adapter numerico durante la finestra.

**Verifiche**

- audit pre/post e checksum/row count;
- test migration su copia con tempi e lock;
- ricerca `Double|double` nelle aree monetarie senza occorrenze accettate;
- test unit/integration/API/frontend;
- riconciliazione saldo pulita.

**Criteri di completamento**

- denaro è `decimal`/`DECIMAL(p,s)` end-to-end;
- conversione dati è documentata e verificata;
- nessuna regressione contrattuale non versionata;
- vecchie colonne rimosse solo dopo gate di osservazione/rollback.

## DAT-23 — Date esplicite e constraint strutturali

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Separare data civile dei movimenti da timestamp UTC e applicare constraint DB compatibili con le regole approvate.

**Situazione attuale**

Il movimento attraversa `DateTime?` → `DateOnly` → `DateTime` midnight. Dashboard riceve timestamp inclusivi. Sessioni e
manifest usano tempo locale. Mancano constraint per coppie/range e lunghezze.

**Motivazione**

Evitare spostamenti di giorno, filtri di fine giornata errati e dati strutturalmente impossibili.

**Prerequisiti**

- DEC-05, DEC-06, DEC-09;
- DB-21.

**File coinvolti**

- `backend/database/Models/TransactionDb.cs`, modelli Identity/sessione e mapping
- command/modelli/controller transaction/dashboard
- clock/session/audit
- migration DB, adapter legacy, DTO `/api/v1` e test.

**Istruzioni operative**

1. Auditare orari/fusi dei valori esistenti: mezzanotte, componenti time non zero, range e ambiguità. Risolvere secondo
   DEC-09.
2. Mappare data movimento a `DateOnly`/MySQL `DATE`; mantenere adapter legacy che accetta il formato storico e normalizza in
   modo deterministico.
3. Usare `TimeProvider.GetUtcNow`/UTC per sessioni, log applicativi e audit; dichiarare precisione colonne timestamp.
4. Rendere filtri dashboard date inclusive esplicite, senza costruire “23:59:59.999”.
5. Aggiungere lunghezze/range/nullability e indici soltanto per invarianti/query confermate. Preparare constraint di
   trasferimento applicabili senza bloccare dati validi; le regole cross-row restano applicative.
6. Migrare in expand/contract e testare adapter legacy e nuova `/api/v1` secondo API compatibility.
7. Non aggiungere ora un campo orario fittizio. Documentare il futuro `occurredAt` opzionale come istante UTC
   `DateTimeOffset`/`DATETIME(6)`, additivo rispetto alla data di business.
8. Testare leap day, confini mese/anno, timezone host diversa e serialization.

**Vincoli**

- nessuna conversione basata sulla timezone della macchina senza regola;
- frontend presenta date con Day.js/next-intl;
- non tradurre/formattare date nel backend;
- constraint applicati solo dopo audit dati pulito.

**Rischi**

- date storiche con orario non zero non hanno interpretazione automatica;
- provider MySQL può avere limitazioni di mapping `DateOnly` da verificare sulla matrice scelta.

**Verifiche**

- audit pre/post;
- test provider reali per `DATE` e UTC;
- contract test legacy e `/api/v1`;
- query dashboard su confini;
- migration/rollback su copia.

**Criteri di completamento**

- movimenti memorizzano data civile senza fuso;
- timestamp operativi sono UTC;
- filtri hanno semantica documentata e testata;
- schema esplicita precisione, lunghezze e constraint approvati.

## DAT-24 — Concorrenza dei saldi e riconciliazione

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Impedire lost update e fornire un controllo ripetibile fra saldo memorizzato e ledger.

**Situazione attuale**

`UpdateWalletCurrentValueCommand` esegue read-modify-write senza concurrency token. `CurrentValue` è denormalizzato e
non esiste riconciliazione.

**Motivazione**

Richieste concorrenti possono perdere un movimento pur lasciando entrambe le transazioni presenti.

**Prerequisiti**

- DAT-22 e DAT-23.

**File coinvolti**

- `backend/database/Models/WalletDb.cs` e mapping/migration
- `backend/logic/Commands/Wallets/UpdateWalletCurrentValueCommand.cs`
- command transaction add/update/delete
- nuovo servizio/comando di riconciliazione
- integration/concurrency test.

**Istruzioni operative**

1. Aggiungere un concurrency token numerico portabile per MySQL; incrementarlo a ogni modifica saldo. Non usare il tipo
   `rowversion` SQL Server.
2. In caso di `DbUpdateConcurrencyException`, rollbackare l'intero use case e ritentare un numero limitato con nuovo
   context; non ritentare singoli `SaveChanges` di un trasferimento parziale.
3. Ordinare accesso ai wallet di un trasferimento per ID o adottare strategia equivalente per ridurre deadlock;
   riconoscere e ritentare solo errori transitori classificati.
4. Dopo ogni retry ricalcolare dal nuovo stato. Non applicare un check di fondi sufficienti: DEC-05 consente saldi
   negativi.
5. Implementare riconciliazione read-only: `Value + SUM(lati wallet)`, con regola esatta su trasferimenti. Output contiene
   ID e differenza, non descrizioni/PII.
6. La riconciliazione presenta eccezione/report DEC-09 sulle anomalie. Nessun repair automatico, neppure a startup;
   l'operatore corregge esplicitamente i dati e rilancia.
7. Testare molte add parallele, due trasferimenti opposti, update/delete concorrenti, retry esaurito e nessuna doppia
   applicazione.

**Vincoli**

- `CurrentValue` resta per compatibilità/performance;
- nessun retry illimitato;
- use case deve essere idempotente rispetto al retry interno;
- nessun repair automatico o endpoint pubblico di correzione.

**Rischi**

- retry senza idempotenza può duplicare righe;
- accesso wallet in ordine diverso può creare deadlock;
- dati storici già divergenti richiedono DEC-09.

**Verifiche**

- test concorrenti ripetuti su MySQL reale;
- somma attesa = saldo per ogni run;
- metriche/log su retry/deadlock senza dati sensibili;
- reconciliation su fixture con anomalia nota;
- failure injection dopo primo lato trasferimento conferma rollback.

**Criteri di completamento**

- nessun lost update nei test concorrenti;
- retry è bounded e dell'intera unit of work;
- riconciliazione rileva ogni differenza fixture;
- ogni anomalia produce eccezione/report azionabile senza modificare dati.

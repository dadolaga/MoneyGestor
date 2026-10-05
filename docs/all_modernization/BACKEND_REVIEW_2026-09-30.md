# Revisione del backend — 30 settembre 2026

## Stato delle correzioni (30 settembre 2026)

| ID | Stato locale |
|---|---|
| B-01 | Workflow aggiornato a SDK .NET 10, restore locked ed export OpenAPI riproducibile. Run GitHub remota da verificare. |
| B-02 | Registrazione legacy + Identity nella stessa transazione MySQL; rollback verificato se Identity rifiuta la password. |
| B-03 | Limite anti abuso condiviso dai percorsi account v1 e legacy; l'ID di un account duplicato non viene restituito. |
| B-04 | Controllo IP prima della chiave identità e cache limitata con eviction. Per deployment multi istanza serve ancora uno store condiviso e la configurazione del proxy fidato. |
| B-05 | Data nullable e obbligatoria nel DTO, con controllo del range MySQL anche nei command. |
| B-06 | Validazione monetaria senza `Decimal.Abs` e con limite condiviso. |
| B-07 | PATCH distingue proprietà omessa e `null` per le due descrizioni. |
| B-08 | Preflight SQL proietta solo ID anomali e riconcilia i saldi nel database; il bootstrap Identity legge gli account completi solo se esistono mapping mancanti. |
| B-09 | README, API, architettura, audit storico e roadmap allineati. |

Build Debug/Release e restore locked passano con zero warning. I test mirati su MySQL effimero passano (13 account/API e 2 preflight). Il run della suite completa è stato interrotto dopo un errore interno del servizio Docker; il nuovo test delle coppie di trasferimento e gli ultimi cambi sono compilati ma attendono una nuova run. La run GitHub remota non è stata osservata.

## Ambito e metodo

Revisione statica della soluzione `backend/backend.sln`: progetti `database`, `logic`, `webserver`, `TestProject` ed entry point `ExportImportApplication`. Ho confrontato controller v1 e legacy, autenticazione, command, policy di ownership, schema/migration, bootstrap, osservabilità, test, Docker Compose, script amministrativi in `ops/database` e workflow GitHub con la documentazione corrente. Non ho letto `settings.json` né collegato un database. Le priorità sotto indicano il rischio residuo **nel codice attuale**; il vecchio [audit](PROJECT_AUDIT.md) è in parte una fotografia storica.

La build locale `dotnet build backend/backend.sln --no-restore` passa con **0 errori e 0 warning**. Non ho eseguito test che avviano MySQL: l'obiettivo di questa attività è documentale e non ho verificato una destinazione Docker/MySQL per un nuovo run.

## Stato positivo da preservare

- Le API v1 usano Identity, cookie HttpOnly, antiforgery sulle mutazioni, DTO e Problem Details. Il token grezzo è confinato agli endpoint legacy, che hanno una finestra di compatibilità documentata.
- Ownership e riferimenti sono controllati tramite policy comuni; i command finanziari usano transazioni, lock ordinati e retry con un nuovo `DbContext`. Gli importi sono `decimal` e i saldi hanno riconciliazione.
- Migration e seed sono versionati; il bootstrap non applica DDL quando è disabilitato. I test di integrazione usano MySQL effimero con guardie sulla destinazione.
- La vecchia CLI ZIP/CSV termina immediatamente con `feature_disabled`; backup e restore amministrativi sono separati e il restore usa uno schema di staging.
- Logging, health check e metriche evitano payload e label contenenti dati utente.

## Rilievi della revisione originaria

### B-01 — P1, confermato: workflow CI incompatibile con .NET 10

Il workflow [api-contract.yml](../.github/workflows/api-contract.yml) installa `dotnet-version: 8.0.x`, ma [global.json](../global.json) richiede SDK `10.0.400` e i progetti targettano `net10.0`. I comandi `dotnet restore/build/test` del job backend non possono quindi usare l'SDK richiesto. Inoltre la [roadmap](backend-modernization/ROADMAP.md) dichiara ancora che non è stata aggiunta alcuna CI GitHub, mentre il workflow è presente. **Intervento:** aggiornare setup-dotnet al feature band 10.0.400, usare restore locked e verificare una run remota; poi allineare roadmap e README. È un difetto di configurazione osservabile nel repository, non una run GitHub riprodotta localmente.

### B-02 — P1, confermato: registrazione su due context senza atomicità

[AccountService.cs](../backend/webserver/Auth/AccountService.cs) (righe 22–65) salva prima `UserDb`, poi crea l'utente Identity su un secondo context. Se il processo cade o `CreateAsync`/la compensazione fallisce tra i due passaggi, resta un utente legacy con password sentinella e senza mapping Identity. [LegacyIdentityBootstrapper.cs](../backend/webserver/Auth/LegacyIdentityBootstrapper.cs) (righe 19–25) blocca esplicitamente lo startup in tale stato. Il `catch (DbUpdateException)` del primo salvataggio restituisce inoltre un successo indistinguibile anche per errori DB diversi da un duplicato. **Intervento:** usare un'unità transazionale condivisa per le due scritture, oppure una registrazione recuperabile/idempotente con stato esplicito; distinguere violazione di unicità da guasti di persistenza. Aggiungere test con fault injection dopo ciascun salvataggio.

### B-03 — P1, confermato: gli endpoint account legacy aggirano il limite anti abuso v1

Il controllo `AccountAbuseGuard.Permit` è chiamato solo da [AuthController.cs](../backend/webserver/Controllers/V1/AuthController.cs) per `/api/v1/auth/*`. [UserController.cs](../backend/webserver/Controllers/UserController.cs) espone ancora `POST /user/add` e `POST /user/login` senza quel controllo. Il login conserva il lockout Identity per singolo account, ma consente tentativi distribuiti su molti account senza limite per IP/operazione; la registrazione legacy non ha neppure il limite di cinque richieste/ora della v1. In più `/user/add` cerca e restituisce l'ID legacy dopo che `RegisterAsync` ha restituito silenziosamente su un duplicato: l'endpoint può rivelare l'esistenza e l'ID di un username. **Intervento:** applicare la stessa guardia agli adapter legacy finché restano pubblici, preservando il loro envelope; evitare di restituire l'ID di un account preesistente. Coprire i due percorsi con test HTTP.

### B-04 — P1, confermato: saturazione globale della guardia in memoria

In [AccountAbuseGuard.cs](../backend/webserver/Auth/AccountAbuseGuard.cs) (righe 13–38) una nuova chiave `identity` viene inserita **prima** di verificare il limite IP. Richieste con identità sempre diverse continuano dunque a occupare memoria anche dopo il blocco dell'IP. Raggiunte 50.000 chiavi, `Permit` rifiuta anche richieste di utenti legittimi fino alla scadenza e pulizia dei contatori. La guardia è per processo: restart e repliche non condividono il limite. **Intervento:** controllare prima il budget IP senza creare nuove chiavi di identità quando è esaurito; usare una cache con eviction e limiti per origine, e un rate limiter condiviso se si distribuiscono più istanze. Verificare il comportamento dietro proxy, dove `RemoteIpAddress` può rappresentare tutti i client.

### B-05 — P1, confermato dal contratto: data obbligatoria rappresentata da value type non nullable

In [ResourceContracts.cs](../backend/webserver/Api/V1/ResourceContracts.cs) (riga 59), `CreateTransactionRequest.Date` è `DateOnly` con `[Required]`. Se il campo JSON manca, il deserializer può passare `default(DateOnly)` (`0001-01-01`); `[Required]` verifica il null e non respinge il default di un value type. Il command [AddTransactionCommand.cs](../backend/logic/Commands/Transaction/AddTransactionCommand.cs) non applica una validazione aggiuntiva della data. La richiesta rischia quindi di arrivare al database e produrre un errore non controllato invece del 400 previsto per un campo mancante. **Intervento:** rendere la proprietà `DateOnly?` con `[Required]` e verificare prima del command, oppure usare una validazione esplicita del valore/default e del range supportato da MySQL. Aggiungere un test HTTP senza `date`.

### B-06 — P2, confermato: un estremo `decimal` può far fallire la validazione con 500

[MoneyAmountAttribute](../backend/webserver/Api/V1/ResourceContracts.cs) (righe 5–13) invoca `Decimal.Abs(amount)`. `Decimal.Abs(Decimal.MinValue)` genera `OverflowException`, quindi un numero JSON rappresentabile come `decimal` può interrompere la validazione e finire nell'handler come errore inatteso. [MonetaryValuePolicy.cs](../backend/logic/Security/MonetaryValuePolicy.cs) usa già il confronto simmetrico senza `Abs`. **Intervento:** riusare il confronto `amount > Maximum || amount < -Maximum` anche nel DTO e testare entrambi gli estremi.

### B-07 — P2, limitazione del contratto PATCH: i campi facoltativi non si possono svuotare

[UpdateTransactionRequest](../backend/webserver/Api/V1/ResourceContracts.cs) usa `String?` per `Description` e `LongDescription`. [ResourceCommandService.cs](../backend/webserver/Api/V1/ResourceCommandService.cs) passa sempre `overwriteNull: false`; [UpdateTransactionCommand.cs](../backend/logic/Commands/Transaction/UpdateTransactionCommand.cs) interpreta quindi sia proprietà assente sia JSON `null` come “conserva il valore”. Un client v1 non può rimuovere una descrizione esistente. **Intervento:** definire nel contratto una distinzione tra proprietà omessa e `null` esplicito e implementarla nel mapper/command; aggiungere test PATCH per omesso, stringa e `null`.

### B-08 — P2, opportunità: preflight di avvio proporzionale a tutti i dati

[DataIntegrityPreflight.cs](../backend/logic/Security/DataIntegrityPreflight.cs) carica tutti i wallet e tutti i movimenti in liste, costruisce un dizionario di tutti i movimenti e controlla le coppie in memoria. [BalanceReconciliationService.cs](../backend/logic/Security/BalanceReconciliationService.cs) esegue un'ulteriore lettura completa; [LegacyIdentityBootstrapper.cs](../backend/webserver/Auth/LegacyIdentityBootstrapper.cs) carica tutti gli utenti a ogni startup. Le guardie sono utili, ma memoria e tempo di avvio crescono con l'intero storico. **Intervento:** misurare su un dataset rappresentativo e spostare i controlli globali in query aggregate/streaming o in un job amministrativo con gate di rilascio, mantenendo il blocco per anomalie. Non rimuovere la verifica senza un sostituto equivalente.

### B-09 — P2, confermato: documentazione di stato non coerente

[README.md](../README.md) riporta ancora “7 warning” e “144/144 test” nella sezione finale, mentre descrive sopra la build a warning zero. [PROJECT_AUDIT.md](PROJECT_AUDIT.md) conserva rilievi storici formulati al presente su `Double`, `EnsureCreated`, test con DB fisso e assenza CI. La [roadmap](backend-modernization/ROADMAP.md) e [ARCHITECTURE.md](ARCHITECTURE.md) dicono che non esiste workflow GitHub, ma `.github/workflows/api-contract.yml` esiste. **Intervento:** datare esplicitamente le baseline storiche e consolidare in un solo punto lo stato corrente dopo la correzione del workflow. Questo evita che un prossimo intervento ripeta o ignori lavoro già svolto.

## Ordine consigliato

1. Correggere B-01 e verificare la pipeline reale.
2. Mettere in sicurezza registrazione e adapter account legacy (B-02, B-03), poi la guardia anti abuso (B-04).
3. Correggere validazione e semantica degli input v1 (B-05, B-06, B-07).
4. Misurare il costo del preflight e aggiornare i documenti di stato (B-08, B-09).

## Limiti della revisione originaria

I rilievi sono derivati da codice e configurazione versionati. Non attestano exploit in un ambiente distribuito né tempi effettivi di startup con dati reali. Non ho eseguito suite Docker/MySQL, fault injection o run remota GitHub; le proposte che dipendono da tali condizioni sono esplicitate come opportunità o verifiche successive. La revisione originaria non aveva modificato API, logica di dominio o dati; le correzioni successive sono riepilogate all'inizio di questo documento.

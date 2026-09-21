# Fase 3 — contratto API e architettura applicativa

Obiettivo della fase: rendere controller sottili, contratto esplicito e autenticazione/validazione parte del pipeline
ASP.NET Core. La logica di dominio non deve essere duplicata fra contratto legacy, nuova `/api/v1` o frontend.

## API-30 — DTO espliciti e use case/query service

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Separare input/output HTTP, modelli applicativi ed entità EF; spostare le query fuori dai controller.

**Situazione attuale**

I controller usano `logic.Models` sia in input sia in output, espongono un `UserDb` in user info e interrogano EF
direttamente per colori, wallet, tipi, movimenti e dashboard.

**Motivazione**

DTO dedicati eliminano over-posting e stabilizzano il contratto mentre la persistenza evolve.

**Prerequisiti**

- ARC-20;
- DEC-03.

**File coinvolti**

- `backend/webserver/Controllers/**`
- `backend/webserver/Models/**`
- `backend/logic/Models/**`
- `backend/logic/Commands/**`
- `backend/logic/Managers/ListManager.cs`
- nuovi request/response DTO, mapper e query/use case;
- contract/API test.

**Istruzioni operative**

1. Inventariare per endpoint i campi letti/scritti dal frontend e congelare characterization test.
2. Creare DTO distinti: create, patch/update, response e list item. Campi owner, saldo corrente, ID server e
   transaction pair non devono essere bindabili dove non previsto.
3. Sostituire `UserDb` response con un profilo minimo senza password/navigation.
4. Estrarre le query controller in query service/use case applicativi che ricevono context scoped e current user.
5. Proiettare direttamente a response/application DTO quando possibile; non materializzare entità/grafi completi.
6. Mantenere i command esistenti dietro use case mentre vengono migrati; non introdurre un mediator solo per dispatch.
7. Per gli endpoint non versionati aggiungere mapper legacy; per `/api/v1` usare i nuovi DTO.
8. Migrare una risorsa verticale per commit: user/session, wallet/color, type/transaction, dashboard.

**Vincoli**

- nessuna entità `database.Models` nel contratto HTTP;
- nessuna logica economica nei mapper/controller;
- envelope e route legacy preservati durante la finestra;
- nessun duplicato della logica fra legacy e `/api/v1`.

**Rischi**

- nullability/casing possono cambiare JSON;
- proiezioni provider-specific possono non tradursi;
- `PATCH` non va introdotto se il client continua a usare PUT senza decisione.

**Verifiche**

- contract snapshot prima/dopo per legacy e `/api/v1`;
- test API per ogni endpoint e null/required;
- `rg` nei controller senza `DbSet`, `DatabaseFactory`, `database.Models` o query LINQ EF;
- test query su MySQL reale;
- frontend typecheck/test per adapter toccati.

**Criteri di completamento**

- controller si limitano a binding, delega e response;
- DTO impediscono over-posting;
- nessuna entità EF è serializzata;
- il legacy resta compatibile; ogni contratto nuovo o breaking appartiene a `/api/v1`.

## APP-31 — Policy di dominio e ownership riusabili

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Centralizzare le regole già corrette in fase 1 senza creare un framework astratto.

**Situazione attuale**

Ownership, saldo e transfer sono distribuiti fra controller e command. SEC-11..13 li rendono sicuri ma possono lasciare
predicati duplicati durante la transizione.

**Motivazione**

Nuovi use case devono riutilizzare la stessa regola e non reintrodurre IDOR.

**Prerequisiti**

- API-30;
- SEC-13;
- DEC-01.

**File coinvolti**

- `backend/logic/Commands/**`
- nuovi use case/policy/validator nel progetto applicativo attuale
- query service introdotti da API-30
- test policy/unit e integration.

**Istruzioni operative**

1. Elencare invarianti condivise reali: current user, risorsa owned/global, tipo Transfer, wallet distinti, saldo,
   riferimenti stesso owner.
2. Estrarre funzioni/policy piccole e nominate. Predicati EF riusabili devono restare traducibili; regole pure non
   devono dipendere dal controller.
3. Evitare un generico `CanAccess<T>` o repository base se le risorse hanno semantiche diverse.
4. Far passare ogni use case attraverso la policy prima della mutazione; il DB resta seconda linea di difesa.
5. Aggiungere unit test tabellari e integration test per traduzione query/race.
6. Rimuovere duplicazioni solo dopo equivalenza testata.

**Vincoli**

- policy non legge header/HTTP;
- current user proviene da un accessor applicativo tipizzato;
- nessun accesso client a `force`, owner o campi audit;
- non introdurre sharing se DEC-01 non lo prevede.

**Rischi**

- astrazione troppo generica nasconde differenze;
- expression non traducibili spostano filtro in memoria.

**Verifiche**

- unit test tabella decisionale;
- SQL/log test verifica filtro server-side;
- matrice API cross-user;
- ricerca dei vecchi predicati duplicati con review manuale.

**Criteri di completamento**

- ogni risorsa usa una policy unica documentata;
- nessun filtro auth in memoria;
- aggiungere un use case non richiede copiare predicati di sicurezza;
- test fase 1 restano verdi.

## API-31 — Validazione e Problem Details centrali

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Validare input in modo uniforme e mappare eccezioni a status/codici stabili senza dettagli interni.

**Situazione attuale**

Controlli manuali parziali, catch per controller, eccezioni basate su messaggi e handler che gestisce solo token
scaduto. `First()`/EF/parser possono produrre 500.

**Motivazione**

Il frontend ha bisogno di errori deterministici/localizzabili; gli operatori devono distinguere bug da input.

**Prerequisiti**

- API-30.

**File coinvolti**

- `backend/webserver/MoneyGestorExceptionHandler.cs`
- `backend/webserver/Controllers/MoneyMenagerController.cs`
- tutti i controller
- eccezioni `backend/logic/Exceptions/**`
- DTO/validator e test.

**Istruzioni operative**

1. Definire catalogo di errori con `code` simbolico, HTTP, esposizione e field errors; mappare separatamente i codici
   numerici legacy.
2. Applicare validation DTO per required, lunghezze, range, email, decimal/date e paging. Regole DB/ownership restano nel
   use case.
3. Sostituire branching su `ex.Message` con tipi/error result espliciti.
4. Centralizzare mapping in exception handler/result mapper. `/api/v1` restituisce `application/problem+json` con
   `code`, `traceId` e field errors; gli inattesi restituiscono 500 generico e vengono loggati una volta.
5. Stabilire 401/403/404 anti-enumeration e applicarlo uniformemente.
6. Mantenere l'envelope soltanto nell'adapter legacy; non avvolgere successi o Problem Details di `/api/v1`.
7. Testare ogni categoria inclusi JSON malformato, overflow, FK/unique race e cancellazione client.

**Vincoli**

- nessuno stack trace, SQL, token o nome interno in response;
- testi server non vengono mostrati direttamente dal frontend;
- codici legacy usati dal vecchio login/registration restano mappati nella finestra;
- non catturare `Exception` nei controller.

**Rischi**

- cambiare status può modificare il ramo Axios;
- mapping troppo ampio può nascondere bug come 400.

**Verifiche**

- matrice errori endpoint × scenario;
- contract test `/api/v1` e test legacy su 101, 102, 111 e sessione;
- test 500 con trace ID e log sicuro;
- ricerca `catch (` nei controller: solo casi realmente locali approvati.

**Criteri di completamento**

- ogni errore noto ha status/codice deterministico;
- 500 è riservato a errori inattesi;
- frontend localizza per codice;
- nessun dettaglio sensibile è esposto.

## API-32 — Cookie Identity, antiforgery e authorization

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Integrare Identity nel pipeline standard, proteggere le mutazioni da CSRF e rendere gli endpoint applicativi
authenticated-by-default.

**Situazione attuale**

Ogni action legge `Authorization`, costruisce `ExecutorManager` e chiama talvolta `LoginUser`. `UseAuthorization` è
presente senza `UseAuthentication`; attributi authorize assenti.

**Motivazione**

La protezione manuale è facile da dimenticare e mescola HTTP/logica/transazioni.

**Prerequisiti**

- SEC-14;
- ARC-20.

**File coinvolti**

- `backend/webserver/Program.cs`
- tutti i controller
- configurazione Identity/cookie/antiforgery e current-user accessor
- endpoint/use case account di SEC-14/15
- OpenAPI e test auth.

**Istruzioni operative**

1. Registrare Identity cookie come scheme di `/api/v1`; costruire il principal con claim user ID stabile e senza entità
   database.
2. Configurare attributi `HttpOnly`, `Secure`, `SameSite`, scadenze e security stamp secondo DEC-02.
3. Registrare `UseAuthentication` prima di `UseAuthorization` e verificare ordine exception/CORS/routing/logging.
4. Applicare fallback policy authenticated-by-default; marcare con `[AllowAnonymous]` soltanto registrazione, verifica,
   login e recupero previsti.
5. Fornire current-user accessor al layer applicativo; rimuovere header/token dai signature controller e login manuale.
6. Abilitare antiforgery token/header su ogni metodo unsafe e CORS credentialed soltanto per origini configurate.
7. Isolare il vecchio authentication handler sulle route legacy; nessun raw token o Bearer proprietario su `/api/v1`.
8. Testare tutte le route per anonimo, cookie valido/scaduto/revocato, antiforgery assente/errato e 401/403/404.

**Vincoli**

- nessun JWT per il browser;
- supporto raw temporaneo limitato al ramo legacy e con criterio di rimozione;
- endpoint template deve essere rimosso o protetto, non lasciato anonimo;
- authorization di risorsa resta nei use case/policy.

**Rischi**

- fallback policy può bloccare Swagger/health se non configurati intenzionalmente;
- configurazione SameSite/CORS errata può impedire login o aprire CSRF.

**Verifiche**

- inventory route con requisito auth esplicito;
- API test cookie, antiforgery, CORS, 401/403/404 e isolamento del raw legacy;
- nessun `[FromHeader Authorization]`, `LoginUser` o token in controller;
- log senza Authorization;
- frontend session flow.

**Criteri di completamento**

- Identity autentica ogni route protetta di `/api/v1`;
- endpoint anonimi sono una allowlist minima;
- principal/current user alimenta tutti i use case;
- auth manuale rimossa dalla nuova API e confinata all'adapter legacy fino al ritiro.

## API-33 — Filtri allowlist e paginazione deterministica

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Sostituire reflection libera e parser fragile con un contratto limitato, validato e indicizzabile.

**Situazione attuale**

`ListFilterUtils` divide stringhe senza controllo, riflette proprietà/nested property, converte con cultura corrente,
usa `offset` come pagina, non limita `limit` e può paginare senza order.

**Motivazione**

Input malformati generano 500; query costose e proprietà interne sono esposte; risultati possono saltare/duplicarsi.

**Prerequisiti**

- API-31;
- DEC-03.

**File coinvolti**

- `backend/logic/Models/ListFilter.cs`
- `backend/logic/Managers/ListManager.cs`
- `backend/webserver/Models/Filter.cs`
- query service transaction
- DTO legacy e `/api/v1`, OpenAPI, frontend client e test.

**Istruzioni operative**

1. Ricavare dai consumer i soli filtri/order realmente usati. Definire enum/allowlist per campi pubblici.
2. Per `/api/v1` usare `page/pageSize`; mantenere nell'adapter legacy l'`offset` storico inteso come pagina.
3. Imporre default e massimo `pageSize`, range checked e sort stabile finale per ID.
4. Parsare date/decimal/enum con cultura invariant e restituire validation error su campo/comparatore sconosciuto; non
   ignorarlo silenziosamente.
5. Costruire espressioni tipizzate/proiezioni, non reflection su qualunque proprietà EF.
6. Verificare indici/piani sulle combinazioni supportate prima di aggiungere indici.
7. Aggiungere test fuzz/property-based leggeri per parser/range e integration test di pagine stabili con valori uguali.

**Vincoli**

- niente OR/espressioni annidate finché non richiesti;
- nessuna libreria TanStack nel frontend;
- il legacy mantiene semantica finché il consumer è attivo;
- non esporre `UserId`, `UserInsertId` o navigation interne come filtro generico.

**Rischi**

- consumer nascosti possono usare campi non rilevati;
- ordinamento diverso cambia UX/pagine.

**Verifiche**

- contract test legacy e `/api/v1`;
- test malformed/overflow/max;
- dataset con chiavi uguali e richieste ripetute restituisce pagine stabili;
- `EXPLAIN` per query critiche su dataset realistico;
- frontend pagination tests.

**Criteri di completamento**

- parser non può lanciare per input utente;
- solo campi/operatori dichiarati sono accettati;
- limiti e ordine sono deterministici;
- vecchio parser rimosso dopo assenza consumer.

## API-34 — Nuova `/api/v1`, OpenAPI e migrazione frontend

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Pubblicare la nuova API formale come artefatto verificabile e migrare il consumer senza big-bang.

**Situazione attuale**

Swagger esiste solo runtime Development; `docs/API.md` è manuale; non c'è diff contract. Frontend usa `useApi`, mentre
slice migrate hanno adapter/fixture ma non integrazione backend.

**Motivazione**

Identity, decimal/date, Problem Details e paginazione richiedono coordinamento misurabile.

**Prerequisiti**

- API-31, API-32, API-33;
- DEC-03.

**File coinvolti**

- `backend/webserver/Program.cs`, csproj e OpenAPI config
- DTO/controller/test API
- nuovo artefatto OpenAPI sotto `docs/` o percorso dedicato
- `frontend/src/hooks/useApi.ts`
- `frontend/src/models/backend.ts`
- adapter/feature frontend interessati
- `docs/API.md`, `docs/ARCHITECTURE.md`, README pertinenti.

**Istruzioni operative**

1. Pubblicare i nuovi endpoint sotto `/api/v1`; gli endpoint attuali restano non versionati e marcati legacy/deprecati.
2. Generare OpenAPI deterministico in build/test con cookie auth, antiforgery, Problem Details, nullability, formati e
   risposte. Documentare l'envelope in una specifica legacy separata se ancora pubblicata.
3. Versionare lo snapshot e aggiungere diff CI; breaking change richiede allowlist/approvazione.
4. Far delegare legacy e `/api/v1` agli stessi use case, con soli adapter HTTP distinti.
5. Migrare frontend nell'ordine account/sessione → wallet → tipo/movimenti → dashboard, una slice completa per volta.
6. Stabilizzare client Promise/error/cancellation e richieste credentialed/antiforgery senza spostare dominio nel client.
7. Conservare next-intl, wrapper navigation, date/numeri neutrali e fixture/stati di presentazione.
8. Misurare uso legacy senza loggare token/PII; rimuoverlo solo con i criteri di `API_COMPATIBILITY.md`.
9. Aggiornare documentazione ed esempi generati/validati contro lo schema.

**Vincoli**

- no TanStack;
- no duplicazione domain logic desktop/mobile o legacy/`/api/v1`;
- nessuna funzione futura dal mockup;
- token raw/envelope legacy non rimossi prima della prova consumer e mai introdotti in `/api/v1`;
- modifiche frontend eseguono tutte le verifiche AGENTS.

**Rischi**

- generatori OpenAPI possono variare ordine/versione e creare diff rumoroso;
- doppio contratto può divergere se duplica use case;
- migrazione frontend può sovrapporsi al workstream visuale.

**Verifiche**

- OpenAPI generation/diff;
- test HTTP legacy/`/api/v1` e adapter frontend;
- `npm --prefix frontend run typecheck`, `lint`, `test`, `build` secondo script disponibili/AGENTS;
- ricerca consumer legacy/raw;
- build/test backend.

**Criteri di completamento**

- specifica riproducibile e controllata in CI;
- frontend usa il contratto target per tutte le slice in scope;
- contratto legacy rimosso oppure mantenuto con owner/data di ritiro esplicita;
- documentazione corrisponde a runtime e test.

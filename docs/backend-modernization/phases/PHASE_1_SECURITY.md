# Fase 1 — hardening di sicurezza

Obiettivo della fase: chiudere esposizione di segreti e accessi cross-account senza cambiare inutilmente il contratto
del frontend. Ogni fix di ownership deve avere un test con due utenti e dati distinti.

## SEC-10 — Logging sicuro e redazione dei segreti

**Stato:** non iniziato

**Priorità:** P0

**Obiettivo**

Impedire che token, password hash, connection string, parametri SQL e payload finanziari siano scritti nei log.

**Situazione attuale**

- `backend/database/MoneyGestorContext.cs:19,28,50-54` abilita sensitive logging per default.
- `backend/logic/Commands/User/FindUserByTokenCommand.cs:21` inserisce il token in un'eccezione.
- `backend/webserver/Controllers/MoneyMenagerController.cs:16` logga `data`, incluso il token di login in debug.
- le eccezioni CLI sono interpolate e poi passate in modo incoerente.

**Motivazione**

La compromissione dei log equivale oggi alla compromissione delle sessioni e può esporre dati personali/finanziari.

**Prerequisiti**

- BSL-00. Non richiede il DB test per la parte statica; i test di integrazione completi richiedono TST-01.

**File coinvolti**

- `backend/database/MoneyGestorContext.cs`
- `backend/logic/Commands/User/FindUserByTokenCommand.cs`
- `backend/webserver/Controllers/MoneyMenagerController.cs`
- `backend/webserver/LoggerFactory.cs`
- `backend/webserver/Program.cs`
- `backend/ExportImportApplication/Program.cs`
- `backend/ExportImportApplication/ImportManager.cs`
- nuovi test di redazione/log capture.

**Istruzioni operative**

1. Rendere sensitive data logging `false` per default e abilitarlo, se ancora necessario, solo con flag development
   esplicito che non sia disponibile in Production.
2. Rimuovere token e valori input dai messaggi di eccezione; usare codice/event ID e, se utile, identificatore hashato
   non reversibile troncato esclusivamente per correlazione.
3. Sostituire il log dell'intero response data con proprietà sicure: status, code, route, durata, trace ID.
4. Configurare redazione dell'header `Authorization`; verificare request logging e framework logs.
5. Uniformare logging eccezioni (`Log.Error(ex, "...")`) senza interpolare segreti.
6. Aggiungere test che catturano log per login valido/errato, token inesistente, wallet e import failure e cercano
   token/password/hash/descrizione sentinella.
7. Documentare livelli e retention; non abilitare `Debug` in produzione per diagnosticare questo step.

**Vincoli**

- conservare segnali diagnostici (route, code, trace ID, tipo eccezione sicuro);
- non cambiare autenticazione o payload HTTP;
- non loggare il body neppure dopo masking parziale.

**Rischi**

- una redazione troppo ampia riduce diagnosi;
- provider/framework possono loggare SQL autonomamente: il test deve coprire configurazione effettiva.

**Verifiche**

- build e test unit/integration sicuri;
- log capture con sentinelle assenti;
- avvio Production con sensitive logging disabilitato;
- revisione di `rg -n 'Token|Password|Authorization|EnableSensitive' backend` per ogni sink/percorso.

**Criteri di completamento**

- nessun segreto o payload sensibile compare nei test log;
- l'abilitazione development richiede un'azione esplicita e non può attivarsi per default;
- errori restano correlabili tramite trace/event ID;
- contratto HTTP invariato.

## SEC-11 — Ownership di portafogli, colori e tipi

**Stato:** non iniziato

**Priorità:** P0

**Obiettivo**

Applicare la policy “globale o dell'utente” a ogni lookup e impedire modifiche/associazioni tramite ID altrui.

**Situazione attuale**

- `EditWalletCommand.cs:25` carica il wallet solo per ID: IDOR confermato.
- `AddNewWalletCommand` non verifica che il colore sia globale o dell'utente.
- add/update transaction non autorizzano il tipo.
- favorite esegue prima una lettura controller non scoped, poi un command scoped.
- delete wallet controlla le transazioni prima di verificare ownership.

**Motivazione**

Chiudere accesso cross-account e rendere uniforme la policy prima di estrarla in APP-31.

**Prerequisiti**

- TST-02.

**File coinvolti**

- `backend/logic/Commands/Wallets/*.cs`
- `backend/logic/Commands/Transaction/AddTransactionCommand.cs`
- `backend/logic/Commands/Transaction/UpdateTransactionCommand.cs`
- `backend/webserver/Controllers/WalletController.cs`
- `backend/webserver/Controllers/ColorController.cs`
- `backend/webserver/Controllers/TypeController.cs`
- test command/API relativi.

**Istruzioni operative**

1. Aggiungere test a due utenti per get, edit, favorite, delete e add wallet con colore privato altrui.
2. Vincolare `EditWalletCommand` a `Id && UserId`; per non-enumeration usare lo stesso esito di risorsa assente.
3. Verificare `ColorId`: `UserId == null || UserId == currentUser`; rifiutare prima del save.
4. Verificare `TransactionTypeId` con la stessa policy in add/update; i tipi globali speciali mantengono regole proprie.
5. Spostare il controllo ownership prima di query che rivelano lo stato del wallet; eliminare la lettura unscoped nel
   favorite controller.
6. Gestire race fra check e FK/unique constraint traducendo il conflitto in errore stabile, senza fidarsi solo del check.
7. Mantenere route/envelope/codici legacy durante la finestra DEC-03; documentare eventuale nuovo codice permesso.

**Vincoli**

- utenti diversi possono mantenere wallet/tipi con lo stesso nome;
- colori/tipi globali restano leggibili;
- nessun nuovo modello di sharing;
- non cambiare ancora schema DB.

**Rischi**

- dati esistenti con riferimenti cross-user possono diventare non modificabili;
- risposte 403/404 incoerenti possono rivelare esistenza: usare la policy decisa in API compatibility.

**Verifiche**

- matrice two-user per ogni mutazione e lookup;
- casi colore/tipo globale, proprio, altrui, inesistente;
- test di race/conflitto almeno a livello DB integration;
- suite completa e contract test.

**Criteri di completamento**

- nessuna query mutante carica wallet/colore/tipo per ID senza owner/global policy;
- un utente non può leggere, associare o mutare risorse private altrui;
- casi globali continuano a funzionare;
- anomalie preesistenti sono riportate, non eliminate implicitamente.

## SEC-12 — Ownership dei movimenti e preflight bloccante

**Stato:** non iniziato

**Priorità:** P0

**Obiettivo**

Rendere coerenti create/list/detail/update/delete/dashboard e impedire attribuzione, lettura o data poisoning
cross-account.

**Situazione attuale**

`transaction.user.id` controlla `UserId`; lista/delete usano `UserInsertId`; dettaglio/dashboard usano `UserId`. Il
converter restituisce profilo `User` e `UserInsert`.

**Motivazione**

È il confine multiutente più critico e non può restare ambiguo.

**Prerequisiti**

- DEC-01 approvata;
- DEC-09;
- TST-02.

**File coinvolti**

- `backend/database/Models/TransactionDb.cs`
- `backend/logic/Commands/Transaction/*.cs`
- `backend/logic/Models/Transaction.cs`
- `backend/logic/Models/Converter.cs`
- `backend/webserver/Controllers/TransactionController.cs`
- `backend/webserver/Controllers/DashboardController.cs`
- test command/API/dashboard;
- script/report read-only e relativa eccezione di dominio/migrazione.

**Istruzioni operative**

1. Produrre report read-only degli invarianti DEC-09 senza loggare PII: conteggi e ID tecnici in artefatto protetto.
2. Con ownership singola, rimuovere/ignorare in modo esplicito `User` dai request DTO e impostare owner dal principal;
   nuovi record devono avere `UserId == UserInsertId`.
3. Applicare lo stesso owner a list, detail, update, delete e dashboard. Il wallet deve appartenere allo stesso owner.
4. Non restituire oggetti user completi dentro movimenti se non necessari al frontend.
5. Aggiungere test attacker/victim: create con victim ID, get per ID, update, delete, dashboard pollution e profile leak.
6. Se esistono dati incoerenti, sollevare l'eccezione DEC-09 con conteggi/ID tecnici e non modificare nulla. L'operatore
   corregge esplicitamente i dati prima di rilanciare.
7. Non introdurre sharing, ACL o membership in questo step; saranno un workstream futuro dedicato.

**Vincoli**

- mantenere saldi e coppie di trasferimento atomici;
- nessuna cancellazione automatica di dati anomali;
- il frontend non deve poter impostare campi server-managed;
- preservare compatibilità JSON finché l'adapter non è migrato.

**Rischi**

- dati storici ambigui possono richiedere scelta manuale;
- cambiare filtro modifica dashboard/lista visibile;
- rimuovere profilo nested può essere breaking change.

**Verifiche**

- matrice cross-user completa a livello command e HTTP;
- query di audit prima/dopo con conteggi attesi;
- dashboard e lista mostrano lo stesso insieme secondo regola documentata;
- OpenAPI/contract diff e test frontend adapter.

**Criteri di completamento**

- nessun campo owner è controllabile dal body;
- tutte le operazioni applicano la stessa policy;
- nessun profilo altrui è esposto tramite movimento;
- anomalie storiche sono risolte o formalmente bloccanti, con evidenza.

## SEC-13 — Saldi negativi e invarianti dei trasferimenti

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Ammettere saldi negativi in modo uniforme e rendere impossibili coppie di trasferimento incoerenti.

**Situazione attuale**

Add crea una coppia se esiste `walletDestinationId` indipendentemente dal tipo; update applica regole diverse; source e
destination possono coincidere; wallet iniziali negativi sono ammessi; i flag `force` bypassano il saldo.

**Motivazione**

La sicurezza dei dati finanziari dipende da invarianti uniformi in create/update/delete.

**Prerequisiti**

- DEC-05;
- SEC-11 e SEC-12.

**File coinvolti**

- `backend/logic/Commands/Transaction/*.cs`
- `backend/logic/Commands/Wallets/AddNewWalletCommand.cs`
- `backend/logic/Commands/Wallets/UpdateWalletCurrentValueCommand.cs`
- `backend/logic/DatabaseInitializer.cs`
- test transaction/wallet.

**Istruzioni operative**

1. Codificare una tabella di verità: tipo Transfer/non-Transfer, destination presente/assente, wallet uguale/diverso,
   segno/zero. Il saldo disponibile non è una condizione di rifiuto.
2. Validare tutto prima della prima modifica al contesto; la transazione resta difesa di rollback.
3. Normalizzare importo trasferimento come valore positivo in input e generare internamente lati opposti.
4. Vietare source = destination e tipi non autorizzati; garantire reciprocità e stesso owner.
5. Rimuovere il flag `force` dai percorsi pubblici e interni in cui serviva soltanto a superare il controllo saldo.
6. Consentire esplicitamente saldo iniziale e corrente negativi, con gli stessi range monetari degli altri valori.
7. Aggiungere test di update tra movimento/trasferimento, cambio wallet, delete e rollback a ogni fallimento.

**Vincoli**

- una mutazione fallita non cambia transazioni né saldi;
- la lista continua a presentare un solo lato del trasferimento finché il contratto non cambia;
- Adjustment e Transfer globali mantengono ID/semantica durante la compatibilità.

**Rischi**

- la UI legacy può rappresentare male i negativi, ma non deve impedire la regola backend approvata;
- dati storici incoerenti possono impedire nuove constraint.

**Verifiche**

- test tabella di verità e rollback;
- query di coppie orfane/non reciproche/valori non opposti;
- test saldo source/destination dopo add/update/delete;
- nessun percorso pubblico passa `force=true`.

**Criteri di completamento**

- ogni combinazione invalida è rifiutata prima del save;
- ogni trasferimento valido ha due lati reciproci, distinti e con somma zero;
- saldi negativi sono accettati e riconciliati in create/update/delete;
- nessun bypass pubblico.

## SEC-14 — ASP.NET Core Identity, cookie e migrazione account

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Sostituire l'autenticazione proprietaria con ASP.NET Core Identity, sessione cookie sicura e un modello estendibile ai
provider esterni.

**Situazione attuale**

Token in chiaro, cookie leggibile dal JavaScript, scadenza aggiornata a ogni richiesta, nessun logout server-side e
autenticazione ripetuta nei controller. Gli hash password legacy sono PBKDF2 custom.

**Motivazione**

Identity fornisce primitive mantenute per account, password, security stamp, cookie, token monouso, lockout e login
esterni, evitando di evolvere un protocollo di sessione proprietario.

**Prerequisiti**

- DEC-02 e DEC-03;
- TST-02. API-32 completerà middleware e contract dopo ARC-20.

**File coinvolti**

- modelli/migration Identity in `backend/database`;
- autenticazione e account in `backend/logic`/nuovo layer applicativo;
- `backend/webserver/Program.cs` e controller/endpoint auth;
- autenticazione legacy esistente, mantenuta soltanto come adapter temporaneo;
- frontend login/session/logout nei file indicati da `API_COMPATIBILITY.md` quando viene migrata la slice.

**Istruzioni operative**

1. Modellare l'utente Identity mantenendo un mapping stabile agli ID utente correnti; usare tabelle di external login
   standard per provider futuri.
2. Implementare un `IPasswordHasher` compatibile col digest legacy: verificare il vecchio formato e restituire
   `SuccessRehashNeeded`, quindi salvare il formato Identity al primo login valido.
3. Configurare il cookie cifrato `HttpOnly`, `Secure` in produzione, `SameSite=Lax`, scadenze assolute/sliding e
   security stamp validation; nessun token di sessione è accessibile al JavaScript.
4. Implementare login, sessione corrente e logout idempotente; revocare le sessioni quando cambiano password o dati di
   sicurezza.
5. Proteggere ogni metodo unsafe con antiforgery token/header e limitare CORS alle origini credentialed configurate.
6. Limitare il validator del token grezzo agli endpoint legacy; la nuova `/api/v1` non lo accetta. Pianificare
   invalidazione unica e rimozione delle righe `LoginDb` al ritiro legacy.
7. Predisporre l'aggiunta di Google/altri provider tramite Identity/OpenID Connect senza abilitarli finché mancano
   credenziali e requisito di prodotto.
8. Testare migrazione utente, rehash, cookie, antiforgery, logout/revoca, scadenze con `TimeProvider`, CORS e log.

**Vincoli**

- password e token non entrano in log o telemetria;
- nessun JWT per il browser senza nuova decisione;
- nessun account viene collegato a un provider esterno in base a email non verificata;
- la migration account non modifica dati finanziari o ownership.

**Rischi**

- mapping errato degli ID può separare l'account dai dati posseduti;
- cookie/topologia errati possono bloccare il frontend o indebolire la protezione CSRF;
- l'invalidazione delle sessioni legacy forza un nuovo login e va resa esplicita.

**Verifiche**

- login con hash legacy produce rehash Identity senza cambiare user ID;
- attributi cookie e protezione antiforgery verificati con test HTTP;
- logout e security stamp invalidano la sessione;
- token legacy respinto da `/api/v1` e accettato solo dalle route legacy durante la finestra;
- contract/frontend flow e log capture senza segreti.

**Criteri di completamento**

- account e sessioni sono gestiti da Identity;
- browser non legge token di autenticazione;
- revoca, scadenze, antiforgery e CORS sono provati;
- estensione a provider esterni non richiede un nuovo modello di sessione;
- ritiro della sessione proprietaria è documentato.

## SEC-15 — Registrazione verificata, recupero e anti-abuso

**Stato:** non iniziato

**Priorità:** P1

**Obiettivo**

Completare la registrazione pubblica con verifica email, recupero account e protezioni anti-abuso configurabili.

**Situazione attuale**

PBKDF2-SHA256 usa 10.000 iterazioni; non esistono verifica email, password reset, limiti server completi o rate limit.
La registrazione pubblica è approvata da DEC-10.

**Motivazione**

Ridurre cracking offline e abuso online/DoS mantenendo il formato hash compatibile.

**Prerequisiti**

- DEC-07, DEC-10;
- SEC-14.

**File coinvolti**

- servizi account Identity e sender email;
- endpoint `/api/v1/auth`;
- `backend/webserver/Program.cs`
- configurazione tipizzata futura/attuale e test auth.

**Istruzioni operative**

1. Configurare policy password, normalizzazione e unicità email/username in Identity; applicare limiti min/max prima
   delle operazioni costose e non normalizzare la password.
2. Creare account non pienamente attivo, inviare token monouso a durata limitata e richiedere conferma della proprietà
   email prima dell'accesso completo.
3. Implementare reinvio verifica e password reset con risposte uniformi che non rivelano se l'account esiste.
4. Astrarre il sender email e validarne la configurazione: in produzione la funzionalità deve fallire chiaramente se
   il provider richiesto non è configurato; token e URL completi non entrano nei log.
5. Applicare rate limit distinti a registrazione, login, reinvio e recupero, combinando IP e identità normalizzata. La
   singola istanza approvata permette limiter in-process con stato protetto e reset al riavvio documentato.
6. Configurare lockout Identity con soglie/durate testate e risposte anti-enumeration.
7. Verificare normalizzazioni/collisioni sui dati esistenti con preflight DEC-09; su anomalia presentare eccezione.
8. Testare happy path e abuso per registrazione, conferma, token scaduto/usato, reinvio, reset, lockout e log sicuri.

**Vincoli**

- gli hash esistenti validi continuano a funzionare tramite SEC-14;
- nessuna password policy solo frontend;
- verifica email obbligatoria; CAPTCHA e MFA restano fuori scope;
- non registrare identità raw nei log del limiter.

**Rischi**

- costo eccessivo causa DoS/latency;
- un futuro passaggio multiistanza richiederà uno store condiviso per limiter/lockout se le garanzie lo esigono;
- normalizzazione email/username può creare collisioni esistenti.

**Verifiche**

- test account inattivo prima della conferma e attivo dopo token valido;
- test token scaduto/riutilizzato, reinvio e password reset;
- test rate limit/lockout e risposte uniformi su account esistente/inesistente;
- test configurazione sender, input boundary e audit log.

**Criteri di completamento**

- email verificata prima dell'attivazione completa e recupero account funzionante;
- limiti input applicati prima del lavoro costoso;
- endpoint anonimi hanno policy anti-abuso coerente con la singola istanza;
- nessuna enumerazione osservabile nelle risposte;
- sender e token lifecycle sono configurabili e testati.

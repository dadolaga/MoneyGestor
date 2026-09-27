# Compatibilità API e frontend

Questo documento definisce la convivenza tra gli endpoint attuali non versionati, d'ora in poi **legacy**, e la nuova
API formale `/api/v1` approvata in DEC-03. Va aggiornato insieme a qualsiasi modifica HTTP.

## Consumer verificati al 27 settembre 2026

Il frontend usa `/api/v1` per account/sessione, wallet, tipi/movimenti e dashboard. Le risorse passano dal client
Promise `frontend/src/lib/api/client.ts`; le form account usano ancora l'adapter callback `frontend/src/hooks/useApi.ts`
ma chiamano esclusivamente endpoint `/api/v1`. Non restano chiamate frontend a risorse legacy. Il client:

- usa `NEXT_PUBLIC_API_URL`, con fallback `http://localhost:5256`;
- usa `withCredentials` e il cookie Identity HttpOnly, senza leggere token di autenticazione;
- ottiene un token antiforgery prima delle mutazioni `/api/v1/auth`;
- si aspetta l'envelope `{ code, message, data? }` e considera `code === 0` un successo;
- costruisce `ResponseError` dai codici applicativi;
- usa `offset` come indice di pagina;
- invia date dashboard come valori Axios derivati da Day.js/Date;
- tipizza alcune mutazioni come `number` anche quando il backend restituisce `data: null`.

Le fixture delle feature rimangono per preview e test, mentre le route live usano dati dal backend. Filtri e paginazione
dei movimenti usano il contratto tipizzato server-side.

Il contratto legacy rimane per consumer esterni non verificabili da questo repository. Owner della finestra di
compatibilità: proprietario del repository. Riesame per eventuale ritiro: 27 dicembre 2026; ritiro consentito solo dopo
la prova d'assenza di consumer esterni e l'osservazione del traffico per la finestra concordata.

## Contratto legacy da caratterizzare

| Area | Contratto osservato | Consumer / nota |
|---|---|---|
| Envelope | `{ code: number, message: string, data?: T }` | `useApi.ts` |
| Auth legacy | `Authorization: <token>` | solo client legacy; il browser usa un ponte interno server-side |
| Registrazione | `POST /user/add`, ID in `data` | codici 101/102 localizzati dal form |
| Login browser | `POST /api/v1/auth/login` | cookie Identity HttpOnly, 2 ore o 30 giorni con `remember` |
| Sessione browser | `GET /api/v1/auth/session` | logout server-side e revoca tramite security stamp |
| Wallet | CRUD `/wallet` | create dichiara ID ma può ricevere `null` |
| Tipo | `GET/POST /type` | globali e personali nello stesso array |
| Movimenti | CRUD `/transaction` | owner dal token; include wallet, tipo e destinazione, non i profili utente |
| Lista | `{ length, data[] }` dentro `data` | `offset` significa pagina |
| Dashboard | `GET /dashboard/all?from&to` | numeri grezzi e categorie type/value |

Prima di cambiarlo, API-30 crea test di caratterizzazione su status, JSON, casing, null, formati e codici. I test non
congelano bug di sicurezza: i casi cross-user vengono aggiornati nello stesso step che corregge l'autorizzazione.

## Confine tra legacy e nuova API

### Endpoint legacy non versionati

Sono ammessi soltanto:

- fix di autorizzazione, data leak e logging;
- adapter verso i nuovi use case;
- correzioni necessarie a mantenere operativo il frontend durante la migrazione;
- header diagnostici additivi e deprecazione documentata.

Restano temporaneamente envelope e token grezzo. Non ricevono nuovi casi d'uso, nuovi campi di dominio o un redesign
parziale. Il token grezzo viene redatto da ogni log e accettato solo da questo ramo compatibile.

### Nuova `/api/v1`

È il solo contratto evolutivo e parte già con convenzioni moderne:

- DTO espliciti e separati dalle entità EF;
- autenticazione Identity con cookie HttpOnly e antiforgery sulle mutazioni;
- risposte di successo tipizzate, senza envelope (`200`, `201` con `Location`, `204` quando appropriato);
- errori `application/problem+json` con codice macchina stabile;
- date `YYYY-MM-DD`, valori monetari JSON numerici e paginazione non ambigua;
- autorizzazione deny-by-default, validation server-side e rate limit;
- OpenAPI riproducibile e contract test obbligatori.

Legacy e `/api/v1` delegano agli stessi use case e policy. Non esistono implementazioni di dominio duplicate per
versione.

La prima slice esistente comprende le route account e risorse wallet, tipi e movimenti, oltre a letture colori e dashboard
sotto `/api/v1`. Le risposte e richieste usano DTO; le query proiettano direttamente, riusano policy SQL-translatable
per owner/global e applicano paginazione `page/pageSize`. Le mutazioni riutilizzano i command esistenti tramite un
executor valorizzato dal current user Identity. Gli adapter legacy continuano a leggere il token raw e a mantenere
l'envelope storico; non duplicano le query v1 e saranno ritirati secondo questa finestra di compatibilità.

## Piano di migrazione

### Finestra 1 — hardening e fondamenta

- correggere ownership e riferimenti cross-user anche sul legacy;
- disabilitare logging sensibile e bloccare la CLI import/export;
- introdurre Identity e migrare gli account, mantenendo il password hash legacy verificabile solo per il rehash;
- creare i nuovi use case/DTO e pubblicare OpenAPI `/api/v1`;
- aggiungere test di caratterizzazione legacy e contract test nuovi.

### Finestra 2 — migrazione frontend per slice

Ordine:

1. registrazione, verifica email, login, sessione, logout e recupero password;
2. wallet;
3. tipi e movimenti;
4. dashboard;
5. eliminazione del vecchio client dopo ricerca completa dei consumer.

Il client `/api/v1` usa `credentials: include`. Per metodi unsafe ottiene e invia l'antiforgery token nell'header
stabilito dal contratto; non legge il cookie di autenticazione. Un cambio locale durante un form continua a richiedere
conferma come previsto dal piano frontend.

### Finestra 3 — ritiro legacy

Prerequisiti:

- nessun consumer nel repository e consumer esterni verificati dal proprietario;
- frontend interamente su `/api/v1`;
- assenza di chiamate legacy nella finestra di osservazione definita;
- invalidazione controllata delle sessioni/token legacy e flusso di nuovo login provato;
- OpenAPI, documentazione, rollback e release note aggiornati.

## Error contract `/api/v1`

Gli errori seguono Problem Details. Estensioni minime:

```json
{
  "type": "https://api.moneygestor.example/problems/validation-failed",
  "title": "Request validation failed",
  "status": 400,
  "code": "validation_failed",
  "traceId": "00-...",
  "errors": {
    "name": ["required"]
  }
}
```

`title` resta generico e non localizzato; il frontend traduce `code` e le chiavi dei field error con next-intl. Non si
espongono stack trace, nomi SQL, PII o dettagli interni.

| Caso | HTTP | Esempio `code` |
|---|---:|---|
| body/query non valido | 400 | `validation_failed` |
| credenziali errate o sessione assente | 401 | `invalid_credentials`, `authentication_required` |
| operazione non consentita | 403 | `forbidden` |
| risorsa assente o non posseduta per lookup ID | 404 | `resource_not_found` |
| duplicato/conflitto/concorrenza | 409 | `resource_conflict` |
| vincolo di dominio | 422 | `domain_rule_violated` |
| rate limit | 429 | `rate_limit_exceeded` |
| errore inatteso | 500 | `unexpected_error` |

Le risorse altrui cercate per ID restituiscono 404 per non confermarne l'esistenza. Le policy autorizzative generali
possono restituire 403 quando l'esistenza della risorsa non è in discussione.

Il legacy mantiene il proprio envelope finché è attivo. I lookup per ID assenti o non posseduti restituiscono oggi
HTTP 404 con `{ code: 404, message: "Resource not found" }`; le combinazioni di movimento/trasferimento non valide
usano il codice applicativo `302` nell'envelope storico.

SEC-11..13 applicano già al legacy la policy di ownership singola: il body non può impostare l'owner, colori e tipi
privati sono utilizzabili soltanto dal proprietario e i saldi negativi sono ammessi. Un trasferimento richiede importo
positivo e due wallet distinti dello stesso owner; il server genera la coppia reciproca e la lista espone un solo lato.

## Autenticazione e account

1. Aggiungere lo schema ASP.NET Core Identity e migrare gli utenti esistenti con identificatori stabili.
2. Usare un password hasher compatibile per verificare il formato PBKDF2 legacy; al primo login valido salvare il
   formato Identity corrente.
3. Esporre sotto `/api/v1/auth` registrazione, conferma email, login, sessione corrente, logout, reinvio conferma e
   password reset, con risposte anti-enumeration.
4. Emettere solo il cookie Identity cifrato `HttpOnly`; `Secure` in produzione e `SameSite=Lax` nella topologia
   same-site. Ruotare il security stamp nei flussi che richiedono revoca.
5. Proteggere i metodi unsafe con antiforgery token/header e validare le origini configurate.
6. Applicare lockout e rate limit distinti a login, registrazione, recupero e reinvio.
7. Tenere l'autenticazione esterna estendibile tramite Identity/OpenID Connect; Google o altri provider aggiungono un
   collegamento esterno, non una seconda sessione proprietaria.
8. Durante la transizione, il validator del token grezzo è registrato soltanto nelle route legacy. Al ritiro legacy le
   righe di sessione proprietarie vengono invalidate e rimosse con migration dedicata.

## Denaro

- valuta corrente EUR;
- `.NET decimal` e MySQL `DECIMAL(19,2)`;
- JSON numerico entro un range esplicitamente validato e sicuro per il client;
- massimo due decimali: input con scala superiore viene rifiutato;
- niente stringhe localizzate, NaN, Infinity o rounding implicito;
- saldo iniziale e corrente possono essere negativi.

Il frontend normalizza l'input locale al boundary e presenta il valore con next-intl. Un requisito futuro di precisione
maggiore o più valute richiede un nuovo modello/versionamento.

## Date

- request/response movimento: `"2026-09-20"`;
- filtri dashboard: `from=2026-09-01&to=2026-09-30`, estremi inclusi;
- sessioni e audit: timestamp UTC;
- nessuna formattazione `it-IT` o `en-GB` nel backend.

L'adapter legacy accetta il timestamp storico e lo normalizza a data civile. `/api/v1` espone solo la data. Un futuro
campo opzionale `occurredAt` sarà additivo e rappresenterà un istante UTC; non viene implementato o simulato ora.

## OpenAPI e contract test

La specifica `/api/v1` viene generata in modo deterministico e versionata. Deve descrivere:

- cookie auth, antiforgery e flussi anonimi;
- DTO, required/nullability, range monetari e formato `date`;
- Problem Details ed esempi per validation, auth, not-found, conflitto e rate limit;
- paginazione e tutti i codici risposta;
- deprecazione separata degli endpoint legacy.

I contract test avviano l'host con MySQL effimero e coprono almeno account/verifica email, antiforgery, 401/403/404,
ownership cross-user, CRUD, paginazione, trasferimenti, saldi negativi, dashboard, CORS e assenza di segreti nei log.

## Checklist per una modifica API

- [ ] OpenAPI prima/dopo confrontata;
- [ ] test di caratterizzazione legacy o contract test `/api/v1` aggiornati;
- [ ] nessuna entità EF esposta direttamente;
- [ ] input incapace di impostare owner o campi server-managed;
- [ ] successo HTTP standard ed errore Problem Details sulla nuova API;
- [ ] errori localizzabili tramite `code`, senza dettagli tecnici o segreti;
- [ ] cookie, antiforgery, CORS e rate limit verificati quando pertinenti;
- [ ] adapter frontend disponibile prima del ritiro legacy;
- [ ] date, numeri, negativi e limiti testati;
- [ ] documentazione e rollback aggiornati.

# Contratto API

Documento descrittivo dei contratti aggiornato al 27 settembre 2026. Gli snapshot OpenAPI riproducibili sono
versionati in [docs/openapi](openapi/) e controllati dalla CI.

## Convenzioni

URL locali:

- sviluppo backend: `http://localhost:5256`
- backend Docker: `http://localhost:5000`

## Health, metriche e correlazione

- GET /health/live riporta solo lo stato del processo e non interroga MySQL.
- GET /health/ready verifica la raggiungibilita del database con SELECT 1; la risposta espone solo Healthy o Unhealthy,
  mai dettagli di connessione.
- GET /metrics pubblica contatori e istogramma Prometheus a cardinalita fissa. La configurazione puo disabilitarlo o
  cambiare percorso; limitarne l'accesso alla rete di scraping.
- Ogni risposta include X-Trace-ID e X-Correlation-ID. Un X-Correlation-ID in ingresso e registrato solo se valido;
  il server genera comunque i propri ID. Le risposte Problem Details mantengono traceId coerente con X-Trace-ID.

Gli endpoint legacy non versionati mantengono questa forma:

```json
{
  "code": 0,
  "message": "",
  "data": {}
}
```

`code = 0` indica successo. Per le liste, `data` contiene:

```json
{
  "length": 42,
  "data": []
}
```

Gli endpoint protetti richiedono:

```http
Authorization: <token>
```

Il valore legacy è il token grezzo, non `Bearer <token>`. `/api/v1` usa invece cookie Identity e non accetta il token
grezzo.

## Endpoint

| Metodo | Percorso | Autenticazione | Risultato principale |
|---|---|---:|---|
| POST | `/user/add` | no | ID utente |
| POST | `/user/login` | no | token |
| GET | `/user/info` | sì | utente corrente |
| GET | `/color` | sì | colori globali e personali |
| GET | `/wallet` | sì | wallet dell'utente |
| GET | `/wallet/{id}` | sì | wallet singolo |
| POST | `/wallet` | sì | crea wallet |
| PUT | `/wallet/{id}` | sì | modifica nome/colore |
| DELETE | `/wallet/{id}` | sì | elimina wallet vuoto |
| PUT | `/wallet/favorite/{id}` | sì | alterna preferito |
| GET | `/type` | sì | tipi globali e personali |
| POST | `/type` | sì | crea tipo personale |
| GET | `/transaction` | sì | lista paginata |
| GET | `/transaction/{id}` | sì | transazione singola |
| POST | `/transaction` | sì | crea transazione |
| PUT | `/transaction/{id}` | sì | modifica transazione |
| DELETE | `/transaction/{id}` | sì | elimina transazione |
| GET | `/dashboard/all?from=...&to=...` | sì | totali e categorie |

## Nuova API `/api/v1`

Le route richiedono il cookie Identity HttpOnly, eccetto i flussi account esplicitamente anonimi. Le richieste POST,
PUT, PATCH e DELETE sotto `/api/v1` richiedono anche `X-CSRF-TOKEN`, ottenuto da `GET /api/v1/auth/antiforgery`.
Gli errori usano `application/problem+json`, con `code` stabile e `traceId`. La registrazione salva il record account legacy e Identity in una sola transazione MySQL.

| Metodo | Percorso | Autenticazione | Risultato |
|---|---|---:|---|
| GET | `/api/v1/auth/antiforgery` | no | token antiforgery |
| POST | `/api/v1/auth/register`, `/login`, `/confirm-email`, `/resend-confirmation`, `/forgot-password`, `/reset-password` | no | account/sessione |
| GET | `/api/v1/auth/session` | sì | profilo minimo |
| POST | `/api/v1/auth/logout` | sì | 204 |
| GET | `/api/v1/colors` | sì | colori accessibili |
| GET/POST | `/api/v1/wallets` | sì | lista / creazione |
| GET/PUT/DELETE | `/api/v1/wallets/{id}` | sì | dettaglio / modifica / rimozione |
| PUT | `/api/v1/wallets/{id}/favorite` | sì | imposta preferito |
| GET/POST | `/api/v1/transaction-types` | sì | lista / creazione tipo |
| GET | `/api/v1/transaction-types/{id}` | sì | tipo singolo |
| GET | `/api/v1/transactions?page=1&pageSize=50` | sì | pagina movimenti con filtri allowlist |
| POST | `/api/v1/transactions` | sì | creazione movimento |
| GET/PATCH/DELETE | `/api/v1/transactions/{id}` | sì | dettaglio / modifica parziale / rimozione |
| GET | `/api/v1/dashboard?from=2026-09-01&to=2026-09-30` | sì | totali e categorie per data civile |

Le risposte resource sono DTO dedicati; non includono entità database o campi owner. La lista movimenti esclude il
lato destinazione del trasferimento e ordina per data e ID decrescenti. `page` parte da 1 e `pageSize` è compreso fra
1 e 100. `GET /api/v1/transactions` supporta inoltre `from`, `to`, `walletId`, `typeId`, `kind` (`Income`, `Expense`,
`Transfer`), `search`, `sortBy` (`Date`, `Description`, `Value`, `Type`, `Wallet`) e `direction` (`Ascending`,
`Descending`). Ogni ordinamento termina con l'ID per mantenere stabili le pagine. In `POST /api/v1/transactions`, `date` è obbligatoria: se manca, la richiesta riceve 400. In `PATCH /api/v1/transactions/{id}`, una proprietà `description` o `longDescription` omessa resta invariata; il valore JSON `null` la cancella.

## Payload essenziali

Registrazione:

```json
{
  "firstname": "Mario",
  "lastname": "Rossi",
  "username": "mrossi",
  "email": "mario@example.com",
  "password": "Password123!"
}
```

Login:

```json
{
  "user": "mrossi",
  "password": "Password123!",
  "remember": false
}
```

Wallet:

```json
{
  "name": "Conto principale",
  "value": 1000.0,
  "color": { "id": 1 }
}
```

Transazione:

```json
{
  "description": "Spesa alimentare",
  "longDescription": null,
  "date": "2026-09-10T00:00:00Z",
  "value": -25.5,
  "transactionType": { "id": 3 },
  "wallet": { "id": 10 },
  "walletDestination": null
}
```

`user` e `userInsert` sono campi server-managed: se presenti nel body vengono ignorati e l'owner viene ricavato dal
token. Nei payload di risposta le due proprietà restano presenti ma valgono `null`, così il contratto JSON legacy non
espone profili utente.

Per un trasferimento, `transactionType.id` è `1`, `value` deve essere positivo e `walletDestination.id` è obbligatorio.
Origine e destinazione devono essere portafogli distinti dello stesso utente. Il backend crea due lati reciproci, uno
negativo sull'origine e uno positivo sulla destinazione; la lista espone soltanto il lato origine. Un movimento non di
trasferimento non può indicare `walletDestination` e il valore deve essere finito e diverso da zero. Saldi iniziali e
correnti negativi sono ammessi e non esistono più flag `force` per aggirare la regola.

Gli importi sono numeri JSON mappati a `decimal`/`DECIMAL(19,2)`: sono ammessi al massimo due decimali e i valori fuori
scala o range vengono rifiutati senza arrotondamento implicito. La data del movimento è persistita come data civile
MySQL `DATE` (anni 1000-9999); l'adapter legacy continua ad accettare il timestamp storico e ne conserva la componente di calendario
senza conversioni dipendenti dal fuso della macchina. I filtri dashboard `from`/`to` sono inclusivi per data civile.

Per lookup puntuali, una risorsa inesistente e una risorsa appartenente a un altro utente producono lo stesso `404`,
senza rivelarne l'esistenza.

## Lista, ordinamento e filtri

`GET /transaction` accetta:

- `limit`: elementi per pagina; default 100;
- massimo `limit`: 100;
- `offset`: indice della pagina, non offset di riga;
- `order`: proprietà separate da `+`; il prefisso `!` indica discendente;
- `where`: clausole AND separate da `&`.

Comparatori supportati:

| Simbolo | Operazione |
|---|---|
| `=` | uguale |
| `!` | diverso |
| `<` | minore |
| `>` | maggiore |
| `~` | contiene, per stringhe |

Esempio:

```http
GET /transaction?limit=15&offset=0&order=!date+description&where=description~spesa%26walletId=10
```

Nel valore decodificato di `where`, `%26` è `&` e combina le clausole. Axios applica il percent-encoding quando riceve l'oggetto `params`; costruendo manualmente la URL è necessario farlo esplicitamente.

Il parser legacy accetta soltanto `Id`, `Description`, `LongDescription`, `Date`, `Value`, `TransactionTypeId` e
`WalletId`; filtri malformati, proprietà sconosciute, conversioni non valide e limiti fuori range vengono rifiutati
come errore di validazione. Le espressioni annidate e OR non sono supportate. L'ordinamento aggiunge `Id` come chiave
finale stabile. Per `/api/v1/transactions` il contratto usa invece `page/pageSize` con ordinamento stabile per data e ID.

## Codici applicativi osservati

| Codice | Significato |
|---:|---|
| 0 | successo |
| 10 | dati obbligatori mancanti |
| 20 | token scaduto |
| 101 | username duplicato |
| 102 | email duplicata |
| 111 | login fallito |
| 121 | utente non trovato o token non valido/scaduto |
| 201 | nome wallet duplicato |
| 202 | wallet non trovato |
| 302 | combinazione di movimento/trasferimento non valida |
| 401 | tipo di transazione duplicato |
| 404 | risorsa inesistente o non posseduta |

Il codice applicativo `404` viene restituito con status HTTP 404. Le combinazioni di movimento non valide conservano
l'envelope legacy e usano il codice `302`; le eccezioni non ancora mappate possono ancora arrivare come errore 500.

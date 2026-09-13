# Contratto API

Documento ricavato dai controller e dal client al 10 settembre 2026. Non sostituisce una specifica OpenAPI versionata.

## Convenzioni

URL locali:

- sviluppo backend: `http://localhost:5256`
- backend Docker: `http://localhost:5000`

Le risposte applicative hanno questa forma:

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

Il valore è il token grezzo, non `Bearer <token>`.

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

Esiste inoltre il controller di esempio `/WeatherForecast`, non usato dal frontend.

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

Per un trasferimento, `transactionType.id` è `1` e `walletDestination.id` è obbligatorio.

## Lista, ordinamento e filtri

`GET /transaction` accetta:

- `limit`: elementi per pagina; default 100;
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

I nomi proprietà non validi possono essere ignorati o causare errori a seconda del percorso di ordinamento; il parser non gestisce espressioni annidate o OR.

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
| 301 | il wallet diventerebbe negativo |
| 401 | tipo di transazione duplicato |

Non tutte le eccezioni di dominio vengono tradotte in codici HTTP/applicativi: diversi casi arrivano oggi come errore 500.

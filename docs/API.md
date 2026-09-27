# Contratto API

Documento ricavato dai controller e dal client, aggiornato al 27 settembre 2026. Non sostituisce una specifica OpenAPI versionata.

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
MySQL `DATE`; l'adapter legacy continua ad accettare il timestamp storico e ne conserva la componente di calendario
senza conversioni dipendenti dal fuso della macchina. I filtri dashboard `from`/`to` sono inclusivi per data civile.

Per lookup puntuali, una risorsa inesistente e una risorsa appartenente a un altro utente producono lo stesso `404`,
senza rivelarne l'esistenza.

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
| 302 | combinazione di movimento/trasferimento non valida |
| 401 | tipo di transazione duplicato |
| 404 | risorsa inesistente o non posseduta |

Il codice applicativo `404` viene restituito con status HTTP 404. Le combinazioni di movimento non valide conservano
l'envelope legacy e usano il codice `302`; le eccezioni non ancora mappate possono ancora arrivare come errore 500.

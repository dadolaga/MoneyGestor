# Backend per la nuova dashboard dei movimenti

> Specifica della dashboard, implementata nel codice il **18 ottobre 2026**.
> Categorie estese, modifica/cancellazione, overview ed export server sono collegati alla UI.
> Migrazione incrementale generata: `20261018115443_ExtendTransactionTypes` (non applicata).
> Le sezioni seguenti conservano il piano originale e le motivazioni; il contratto consegnato è nella
> [API reference](../07-api-reference.md). PATCH/DELETE delle categorie restano facoltativi e non implementati.
>
> Ricorrenze escluse: nel frontend resta soltanto lo switch disabilitato con "To be implemented".
> Non sono presenti API, worker o persistenza delle ricorrenze. Nessun database è stato modificato.

## Indice

1. [Obiettivo e priorità](#1-obiettivo-e-priorità)
2. [Cosa esiste già e cosa manca](#2-cosa-esiste-già-e-cosa-manca)
3. [Regole da conservare](#3-regole-da-conservare)
4. [Database: modifiche proposte](#4-database-modifiche-proposte)
5. [API: letture e riepiloghi](#5-api-letture-e-riepiloghi)
6. [API: categorie](#6-api-categorie)
7. [Funzionalità rinviate](#7-funzionalità-rinviate)
8. [Errori, sicurezza e configurazione](#8-errori-sicurezza-e-configurazione)
9. [File da modificare e collegamento frontend](#9-file-da-modificare-e-collegamento-frontend)
10. [Migrazioni e ordine di consegna](#10-migrazioni-e-ordine-di-consegna)
11. [Criteri di completamento](#11-criteri-di-completamento)

## 1. Obiettivo e priorità

La pagina reale è `/dashboard/transaction` (oppure `/it/dashboard/transaction`) e monta
[`TransactionsDashboard`](../../../frontend/src/features/transactions/TransactionsDashboard.tsx).
Il riferimento è questa pagina, insieme ai suoi dialoghi, non il catalogo `/design-system`.

Per usare **le funzionalità già attive** non serve riscrivere il backend: elenco, filtri,
ordinamento, paginazione, creazione e categorie con solo nome hanno già un contratto.
Per completare **le funzionalità richieste del nuovo editor** servono categorie estese. Per evitare di scaricare tutti i movimenti a ogni filtro servono aggregazioni
lato server. Modifica e cancellazione richiedono soprattutto il collegamento della UI alle API esistenti.

| Priorità | Intervento | Impatto DB | Risultato |
| --- | --- | --- | --- |
| P1 | Estendere le categorie esistenti | Colonne e relazione padre | Tutti i campi del dialogo categoria vengono salvati |
| P1 | Collegare modifica/cancellazione | Nessuna nuova tabella per il CRUD di base | Le azioni della riga funzionano sulle API già presenti |
| P2 | Aggregazioni della dashboard | Nessuna nuova tabella; eventuali indici | KPI e grafici senza scaricare l'intero periodo |
| P2 | Esportazione server del CSV | Nessuna nuova tabella | L'export continua a funzionare dopo la rimozione del caricamento completo |

**P1** completa le funzioni oggi limitate o rinviate. **P2** è il percorso raccomandato per
volumi crescenti e sostituisce l'attuale elaborazione completa nel browser.

Allegati e bozze sono esclusi dal prodotto richiesto: non prevedere tabelle, API o controlli UI
per queste funzionalità.

## 2. Cosa esiste già e cosa manca

### Stato verificato nel codice

| Funzione della dashboard | Stato backend / frontend | Azione necessaria |
| --- | --- | --- |
| Portafogli disponibili | `GET /api/v1/wallets`, con `hasOwnBalance` | Riutilizzare; l'editor ammette solo portafogli con saldo proprio |
| Categorie disponibili | `GET /api/v1/transaction-types` | Estendere DTO e proiezioni con i nuovi metadati |
| Nuova categoria | `POST /api/v1/transaction-types` salva solo `name` | Persistenza di padre, icona, colore, descrizione, parole chiave e preferenza report |
| Elenco movimenti | `GET /api/v1/transactions` paginato | Riutilizzare; trasferimenti restituiti una volta sola |
| Filtri | `from`, `to`, `walletId`, `typeId`, `kind`, `search` già supportati | Condividerne la semantica con riepiloghi ed export |
| Ordinamento | `Date`, `Description`, `Value`, `Type`, `Wallet`; ID come spareggio | Riutilizzare senza aggiungere colonne DB per l'ordinamento |
| Entrata, uscita, trasferimento singolo | `POST /api/v1/transactions` già collegato | Riutilizzare il contratto e il comando finanziario esistenti |
| Note | Campo UI `notes` inviato come `longDescription` | Nessuna nuova colonna: esiste già `TransactionDb.LongDescription` |
| Dettaglio, modifica, cancellazione | GET/PATCH/DELETE `/api/v1/transactions/{id}` già presenti | Collegare dialoghi e azioni; oggi il menu mostra solo un avviso |
| Totali e confronto precedente | Il frontend carica tutte le pagine del periodo corrente e precedente | Nuova lettura aggregata consigliata |
| Grafici categorie, settimane e miniature KPI | Calcolati nel browser sui movimenti completi | Includere tutti questi dati nella lettura aggregata |
| Ultimi movimenti | Primi quattro elementi del periodo ordinato per data discendente | Nuova aggregazione o riuso dell'elenco con `pageSize=4` |
| CSV | Generato nel browser con tutto il periodo filtrato | Conservare fino all'introduzione dell'export server |

Il backend espone anche `GET /api/v1/dashboard?from=...&to=...`, usato dalla dashboard generale.
Restituisce entrate, uscite e categorie nette: **non** include tutti i filtri, trasferimenti,
conteggi, confronto, settimane e miniature richiesti dalla pagina movimenti. Le sue uscite sono
negative; non cambiarne implicitamente il significato per adattarlo alla nuova pagina.

### Punti di riferimento

- [Contratti attuali](../../webserver/Api/V1/ResourceContracts.cs) e [controller](../../webserver/Controllers/V1/ResourceControllers.cs).
- [Query attuali](../../webserver/Api/V1/ResourceQueryService.cs) e [client frontend](../../../frontend/src/lib/api/client.ts).
- [Caricamento della dashboard](../../../frontend/src/features/transactions/useTransactionsDashboard.ts).
- [Editor del movimento](../../../frontend/src/features/transactions/TransactionEditorDialog.tsx),
  [editor categoria](../../../frontend/src/features/categories/CategoryEditorDialog.tsx) e
  [modello del form](../../../frontend/src/features/transactions/transaction-editor-model.ts).

## 3. Regole da conservare

| Area | Vincolo |
| --- | --- |
| Identità | `ApplicationIdentityUser.Id` è anche il proprietario finanziario; non creare una seconda tabella utenti |
| Ownership | Proprietario dalla sessione; mai `userId`/`ownerId` scelto dal client. Risorsa altrui o assente: stesso 404 |
| Denaro | `decimal` in .NET e `DECIMAL(19,2)` in MySQL; niente `double`, zero nei movimenti o arrotondamenti impliciti |
| Date | Date finanziarie `DateOnly` / `DATE`, anni 1000–9999, formato `YYYY-MM-DD`; timestamp operativi UTC |
| Entrate/uscite | `value > 0` entrata, `value < 0` uscita, salvo trasferimenti |
| Trasferimenti | Richiesta con importo positivo, tipo riservato Transfer e due portafogli diversi dello stesso proprietario |
| Registrazioni | Due righe reciproche per trasferimento; saldo sorgente negativo e destinatario positivo; operazione atomica |
| Letture | Elenco e conteggi mostrano una sola riga per trasferimento, quella sorgente |
| Saldi | Solo comandi finanziari, lock ordinati, `BalanceVersion` e retry dell'executor; nessun aggiornamento diretto nei controller  |
| Portafogli | Solo bank/prepaid/cash hanno saldo proprio; debit/credit non diventano conti movimentabili con questo lavoro |
| HTTP | Solo `/api/v1`, Identity cookie HttpOnly, antiforgery sulle mutazioni, DTO e Problem Details |

**Attenzione al segno dei trasferimenti in lettura:** la proiezione attuale restituisce il `Value`
della riga sorgente, quindi negativo. Il POST richiede invece la grandezza positiva. Nell'editor
di modifica usare `abs(value)` e inviare il valore positivo per un trasferimento. Un commento nel
componente di visualizzazione parla di grandezza positiva in risposta, ma il codice della query
non la converte: il contratto va ricavato dalla proiezione effettiva.

Limiti attuali da preservare: descrizione API 200 caratteri, note API 2000, nome categoria 100,
ricerca 100, `pageSize` da 1 a 100. Il campo note della nuova UI si ferma a 240 caratteri: è un
limite di presentazione, non la necessità di restringere la colonna esistente.

## 4. Database: modifiche proposte

I nomi seguenti sono proposti. Implementare modelli EF, mapping, FK, indici e migrazioni insieme.
Non creare una tabella `category` parallela a `transaction_type`, né una tabella riepiloghi da
sincronizzare con il registro finanziario.

### 4.1 Estendere `transaction_type`

| Campo nuovo | Tipo proposto | Default / vincolo |
| --- | --- | --- |
| `ParentId` | `BIGINT UNSIGNED NULL` | FK alla stessa tabella, cancellazione Restrict |
| `Icon` | `VARCHAR(32) NOT NULL` | `tag`; chiave di un catalogo chiuso |
| `Color` | `VARCHAR(16) NOT NULL` | `grey`; token semantico, non CSS arbitrario |
| `Description` | `VARCHAR(500) NULL` | Facoltativa |
| `Keywords` | `VARCHAR(1000) NULL` | Testo come nel form corrente; trim, senza automazioni implicite |
| `UseInReports` | `BOOLEAN NOT NULL` | `true`, per non escludere dati esistenti |

Conservare `Id`, `Name`, `UserId` e l'unicità attuale `(UserId, Name)`. Aggiungere un indice
su `ParentId`. Normalizzare il nome con trim e rifiutare nomi vuoti dopo la normalizzazione.

Regole per la gerarchia:

- Una categoria privata può avere come padre una categoria globale ordinaria o una dello stesso utente.
- Una categoria globale può dipendere solo da un'altra globale. Le API utente non modificano categorie globali.
- Vietare autoriferimenti e cicli; il cambio padre deve validare tutta la catena dentro la transazione.
- Transfer e Adjustment sono tipi di sistema, non padri selezionabili o categorie gestibili dall'utente.
- Il filtro `typeId` resta per categoria esatta; l'inclusione dei discendenti non è implicita.

`UseInReports` salva una preferenza: **non** altera saldo, elenco, CSV, KPI o grafici di questa
dashboard. Un futuro report dovrà richiederne esplicitamente l'applicazione. Le parole chiave
non introducono assegnazione automatica delle categorie.

Per riconoscere i tipi riservati aggiungere al DTO `systemKind: "Transfer" | "Adjustment" | null`,
derivato dagli identificatori riservati di `DatabaseInitializer`. Non serve una colonna duplicata.
Il frontend oggi cerca il nome `transfer`: sostituire quel confronto con il metadato di sistema,
così una categoria privata omonima non viene interpretata come trasferimento.

### 4.2 Indici di lettura

Per riepiloghi ed export è sufficiente interrogare le tabelle correnti.

Esiste già l'indice `transaction(UserId, Date)`. Valutare con il piano delle query indici composti
come `(UserId, WalletId, Date)` o `(UserId, TransactionTypeId, Date)`; non aggiungerli tutti senza
evidenza. La ricerca corrente usa `Contains` su descrizione e note: un normale indice B-tree non
risolve automaticamente la ricerca di sottostringhe. Un eventuale full-text richiede una decisione
separata sulla semantica; non è necessario per completare il nuovo editor.

## 5. API: letture e riepiloghi

### 5.1 Endpoint aggregato proposto

```http
GET /api/v1/transactions/overview?from=2026-10-01&to=2026-10-31&walletId=10
```

Query: `from` e `to` obbligatori e inclusivi; `walletId`, `typeId`, `kind`, `search` facoltativi,
con gli stessi limiti e predicati dell'elenco. Non accettare paginazione o ordinamento: l'overview
descrive tutto l'insieme filtrato. Il filtro portafoglio include i trasferimenti in cui il
portafoglio è sorgente **o** destinatario, sempre una volta sola.

Risposta **proposta**, 200:

```json
{
  "period": { "from": "2026-10-01", "to": "2026-10-31" },
  "totals": {
    "income": 2000.00, "expense": 650.00, "transfers": 150.00,
    "incomeCount": 1, "expenseCount": 8, "transferCount": 2, "movementCount": 11
  },
  "previous": {
    "period": { "from": "2026-09-01", "to": "2026-09-30" },
    "totals": {
      "income": 1800.00, "expense": 600.00, "transfers": 100.00,
      "incomeCount": 1, "expenseCount": 6, "transferCount": 1, "movementCount": 8
    }
  },
  "expenseCategories": [
    { "typeId": 3, "value": 400.00 },
    { "typeId": 4, "value": 250.00 }
  ],
  "weekly": [
    { "from": "2026-10-01", "to": "2026-10-07", "income": 2000.00, "expense": 200.00 },
    { "from": "2026-10-08", "to": "2026-10-14", "income": 0.00, "expense": 150.00 },
    { "from": "2026-10-15", "to": "2026-10-21", "income": 0.00, "expense": 100.00 },
    { "from": "2026-10-22", "to": "2026-10-28", "income": 0.00, "expense": 150.00 },
    { "from": "2026-10-29", "to": "2026-10-31", "income": 0.00, "expense": 50.00 }
  ],
  "daily": [
    { "date": "2026-10-01", "income": 2000.00, "expense": 0.00, "transfers": 0.00, "movementCount": 1 }
  ]
}
```

Nell'esempio `daily` è abbreviato: la risposta reale deve includere ogni giorno del periodo,
con zeri nei giorni vuoti, e somme coerenti con `totals`. Le categorie sono risolte dal catalogo
`transaction-types`; in alternativa usare lo stesso DTO categoria annidato già usato dall'elenco,
senza introdurre un altro modello divergente.

Semantica da implementare:

- `income`, `expense`, `transfers` sono grandezze non negative. I trasferimenti non partecipano
  a entrate/uscite e `movementCount` conta la coppia una sola volta. `transfers` è volume trasferito,
  non saldo netto del portafoglio filtrato.
- `expenseCategories` somma solo le uscite per categoria esatta, senza compensarle con entrate
  della stessa categoria. Ordinare per importo decrescente e ID per stabilità.
- `weekly` usa blocchi di sette giorni ancorati a `from`, con ultimo blocco parziale: è il
  comportamento attuale, non una suddivisione per settimane ISO.
- `daily` alimenta le miniature delle quattro card: il frontend ricava gli attuali 12 segmenti
  usando `min(11, floor(dayOffset / inclusiveDayCount * 12))`, sommando importi e conteggi.
- Il confronto usa il mese precedente se il periodo è un intero mese; altrimenti il periodo
  immediatamente precedente di uguale durata inclusiva. Conservare gli altri filtri.
- La variazione percentuale rimane derivabile da totali correnti e precedenti. Con base zero
  mostrare «confronto non disponibile», senza divisioni per zero.
- Periodo vuoto: 200 con totali zero e serie giornaliere/settimanali a zero. Validare anche
  l'intervallo precedente e gli estremi supportati prima di sottrarre giorni o mesi.

Per gli ultimi quattro movimenti riusare:

```http
GET /api/v1/transactions?from=2026-10-01&to=2026-10-31&page=1&pageSize=4&sortBy=Date&direction=Descending
```

Applicare anche qui gli altri filtri attivi. Non serve una nuova tabella o un endpoint dedicato.

### 5.2 Implementazione delle query

Estrarre il predicato dei movimenti visibili e dei filtri usato da elenco, overview ed export.
Aggregare nel database con `Sum`, `Count`, `GroupBy` e proiezioni, senza materializzare tutti i
movimenti. Usare `AsNoTracking` e propagare `CancellationToken`.

Se la risposta overview richiede più query, eseguirle su una vista coerente dei dati con una
transazione di lettura e isolamento appropriato, verificato sul provider MySQL, oppure con una
strategia equivalente. Non usare query concorrenti sullo stesso `DbContext`. Elenco e overview
richiesti separatamente possono osservare istanti diversi: non promettere uno snapshot comune
senza un contratto aggiuntivo. Dopo una mutazione ricaricare entrambi.

### 5.3 Export CSV proposto

```http
GET /api/v1/transactions/export?from=2026-10-01&to=2026-10-31&kind=Expense&locale=it
```

- Stessi filtri dell'elenco; periodo obbligatorio. Esporta **tutti** i risultati, senza `page` o `pageSize`.
- `locale`: `en` o `it`, default `en`; serve per intestazioni e tipo movimento, non traduce nomi utente.
- Ordinamento data e ID discendenti, come il CSV attuale, indipendente dall'ordinamento della tabella.
- 200 `text/csv; charset=utf-8`, `Content-Disposition: attachment`, nome generato dal server.
- Conservare BOM UTF-8, separatore `;`, date ISO, importi con punto decimale, quoting e difesa da
  formule nei campi testuali. Non trasformare gli importi negativi in formule o testo non numerico.
- Colonne attuali: data, descrizione, tipo movimento, categoria, portafoglio, destinazione, importo.
  Il trasferimento compare una volta con il valore firmato della sorgente, come oggi.
- Produrre il file senza caricare tutte le righe in memoria e senza applicare il limite di 100
  della paginazione. Risultato vuoto: CSV con sole intestazioni.

Non rimuovere `loadPeriod` finché grafici, confronto, miniature, recenti **ed export** non hanno
tutti una sorgente sostitutiva. Se si rimanda l'export server, conservare il caricamento completo
su richiesta per il download, non per ogni aggiornamento della dashboard.

## 6. API: categorie

Estendere gli endpoint esistenti `GET /api/v1/transaction-types`, GET dettaglio e POST.
Esempio di nuovo POST **proposto**:

```json
{
  "name": "Spesa alimentare",
  "parentId": null,
  "icon": "shopping",
  "color": "green",
  "description": "Acquisti per la casa",
  "keywords": "supermercato, alimentari",
  "useInReports": true
}
```

201 con `{ "id": 3 }` e `Location`, come oggi. Il GET restituisce tutti questi campi, più
`id`, `isGlobal`, `systemKind`. I vecchi client che inviano solo `name` continuano a funzionare
grazie ai default. Le categorie annidate nei movimenti usano lo stesso DTO aggiornato.

Cataloghi da validare sul server e condividere nel contratto:

| Campo | Valori |
| --- | --- |
| `icon` | `shopping`, `home`, `transport`, `food`, `utilities`, `work`, `entertainment`, `health`, `tag` |
| `color` | `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `grey` |

Il token colore viene tradotto dal frontend nei suoi token di tema; non accettare HTML, SVG o CSS
inviati dal client. Allineare i `maxLength` dei controlli ai limiti API nuovi della sezione 4.1.

**Facoltativi, per la gestione successiva delle categorie:** PATCH e DELETE
`/api/v1/transaction-types/{id}` non esistono oggi e non sono indispensabili al dialogo di creazione.
Se introdotti, PATCH supporta `parentId: null` per rimuovere il padre; DELETE risponde 409 se la
categoria ha figli o movimenti. Non cancellare a cascata il registro finanziario.
Le categorie globali/riservate non sono modificabili con queste API utente.

## 7. Funzionalità rinviate

Le ricorrenze sono escluse dal backend. Nel dialogo movimento resta lo switch disabilitato
con la descrizione "To be implemented", senza calendario o chiamate API dedicate.

## 8. Errori, sicurezza e configurazione

### Errori

Conservare i codici correnti e applicarli anche ai nuovi contratti.

| HTTP | Codice | Uso |
| --- | --- | --- |
| 400 | `validation_failed` esistente | Campi, calendario, intervallo, icona/colore, combinazioni non valide |
| 400 | `antiforgery_validation_failed` esistente | Cookie/token CSRF non valido |
| 401 | `authentication_required` esistente | Sessione assente o scaduta |
| 404 | `resource_not_found` esistente | Risorsa inesistente o non accessibile |
| 409 | `resource_conflict` esistente | Duplicati, risorse referenziate, versione obsoleta o chiave idempotente riusata con payload diverso |
| 422 | `domain_rule_violated` esistente | Regole finanziarie, ad esempio trasferimento non valido |
| 500 | `unexpected_error` esistente | Errore inatteso, dettagli solo nei log |

Problem Details con `code`, `traceId` e, per la validazione, `errors` indicizzato per campo:
per esempio `schedule.endDate` e `parentId`. Integrare la mappatura in `ApiProblemError` e negli
editor; il dialogo movimento attuale distingue 400/401/404 e deve gestire anche 409/422.
Adeguare gestione errori e OpenAPI ai nuovi contratti.

### Configurazione e operatività

| Area nuova | Impostazioni da definire e validare |
| --- | --- |
| Export cross-origin | Esporre `Content-Disposition` nel CORS se il client legge il nome del CSV |
| Proxy | Timeout coerenti con l'export CSV |

Per nuove opzioni aggiornare insieme `settings.example.json`, classi opzioni, validazione e
[guida configurazione](../06-settings-reference.md). Non copiare credenziali o configurazioni
locali negli esempi. Nessun token di autenticazione in JavaScript.

Log applicativi in inglese con identificatori tecnici; non registrare note, payload finanziari,
cookie o stringhe di connessione.

## 9. File da modificare e collegamento frontend

| Area | Intervento |
| --- | --- |
| [`database/Models`](../../database/Models) | Estensione `TransactionTypeDb` |
| [`MoneyGestorContext`](../../database/MoneyGestorContext.cs) | DbSet, mapping, FK, indici, precisione e concorrenza |
| [`database/Migrations`](../../database/Migrations) | Migrazioni incrementali e snapshot del modello |
| [`logic/Commands/Transaction`](../../logic/Commands/Transaction) | Estendere creazione/modifica/cancellazione con metadati; comandi delle categorie senza duplicare regole finanziarie |
| [`logic/Security`](../../logic/Security) | Ownership nuove risorse, gerarchia categorie |
| [`ExecutorManager`](../../logic/ExecutorManager.cs) | Riutilizzare esecuzione atomica e comandi figli; non creare un executor concorrente alternativo |
| [`webserver/Api/V1`](../../webserver/Api/V1) | DTO, query condivise, overview, export CSV |
| [`webserver/Controllers/V1`](../../webserver/Controllers/V1) | Binding, cookie/CSRF e delega ai servizi/comandi |
| [`Program.cs`](../../webserver/Program.cs) | Registrazioni DI dei servizi della dashboard |
| [`MoneyGestorExceptionHandler`](../../webserver/MoneyGestorExceptionHandler.cs) | Mappatura delle nuove eccezioni, senza esporre dettagli interni |
| [`TestProject`](../../TestProject) | Copertura mirata dei nuovi vincoli e concorrenza quando la fase di implementazione la richiede |

L'integrazione richiede anche questi adeguamenti frontend, in una successiva fase di codice:

1. Estendere `ApiTransactionType`, `ApiTransaction`, DTO di scrittura e metodi di `apiClient`.
   Aggiungere il GET dettaglio movimento al client se usato: esiste nel controller, non nel client attuale.
2. Nel dialogo categoria inviare i campi reali e usare la risposta/lettura canonica: oggi viene
   costruito localmente solo `{ id, name, isGlobal }`. Togliere l'avviso di anteprima dopo la persistenza.
3. Usare `systemKind` al posto del nome `Transfer`; leggere icona e colore dal DTO in tabella,
   grafico categorie e selettori, sostituendo le attuali euristiche su nome/ID.
4. Nel dialogo movimento mantenere soltanto il POST ordinario; lo switch ricorrente resta
   disabilitato con "To be implemented". Allegati e bozze sono esclusi.
5. Trasformare il menu azioni in modifica/cancellazione con conferma e ricaricamento dati;
   preservare le semantiche PATCH: campo omesso invariato, `description`/`longDescription: null` cancellati.
6. Quando disponibile P2, sostituire i due `loadPeriod` con overview, richiesta recenti ed export
   server; non lasciare una dipendenza nascosta dalle righe complete nei grafici.
7. Gestire caricamento, errori di campo e refresh dopo mutazioni. Aggiornare
   entrambe le lingue.

Aggiornare [API reference](../07-api-reference.md), [guida database](../08-database-and-business-rules.md),
[guida frontend](../05-frontend.md), [README della feature](../../../frontend/src/features/transactions/README.md)
e [OpenAPI](../../../docs/openapi/v1.json) **quando** i contratti sono implementati. Fino ad allora
questo documento resta un piano e le guide del contratto corrente non devono presentare le proposte come attive.

## 10. Migrazioni e ordine di consegna

### Strategia di migrazione

Lo schema corrente comprende i metadati delle categorie ed è identificato dalla
versione `1` in `database_metadata`. Il precedente bootstrap e la catena di migrazioni
EF sono stati eliminati. Seguire la [guida al processo manuale](../database-migration-redesign.md):
applicazione ferma, export versionato, import nello schema corrente di un nuovo
database, verifiche e cambio manuale di configurazione.

Per ulteriori modifiche al modello, aggiornare la versione dello schema e valutare
il contratto CSV e gli eventuali convertitori. Conservare payload, segni e status
attuali e definire default espliciti nelle conversioni quando diventano necessari.
Lo startup valida soltanto e richiede l'aggiornamento manuale se la versione non coincide.

### Ordine operativo

| Passo | Consegna | Dipendenze |
| --- | --- | --- |
| 1 | Categorie complete, metadato `systemKind`, migrazione e UI collegata | Contratto categorie definito |
| 2 | Modifica/cancellazione UI | API CRUD già disponibili |
| 3 | Overview, recenti ed export server; rimozione caricamento completo | Tutti i consumatori frontend aggiornati insieme |

I passi sono consegne funzionali: non abilitare un controllo prima che salvataggio, lettura ed
errori del relativo flusso siano implementati.

## 11. Criteri di completamento

Checklist di accettazione per la **futura implementazione**, non verifiche eseguite creando questo README.

### Dati e regole

- [ ] Tutti i campi categoria si ritrovano dopo una nuova lettura; vecchi record e POST con solo nome funzionano.
- [ ] Cicli, categorie riservate e riferimenti di un altro proprietario sono rifiutati.
- [ ] Creazione/modifica/cancellazione trasferimenti conserva coppia, segni e saldi coerenti.

### API e dashboard

- [ ] Filtri identici su elenco, overview, recenti e CSV, inclusi portafoglio destinatario e ricerca note.
- [ ] Totali e conteggi comprendono periodi oltre 100 movimenti; trasferimenti conteggiati una volta sola.
- [ ] Categorie di spesa non compensate con entrate; giorni/settimane vuoti e confronto con base zero gestiti.
- [ ] KPI, confronto, miniature, grafici, recenti ed export funzionano senza scaricare tutto il periodo a ogni filtro.
- [ ] UI gestisce sessione scaduta, CSRF, errori di validazione e conflitti senza perdere il lavoro.
- [ ] Modifica e cancellazione usano le API esistenti e ricaricano elenco, saldi e riepiloghi interessati.
- [ ] Contratti, esempi, OpenAPI, configurazione e documentazione corrispondono alle funzioni consegnate.

### Verifica prevista dal repository

Per implementazione backend: `dotnet build backend/backend.sln`. La
[guida di sviluppo](../10-development-and-troubleshooting.md) segnala attualmente consumer storici
non migrati in `TestProject`: è una limitazione documentata, da verificare nella fase di codice,
non una giustificazione per ripristinare API legacy. Distinguere eventuale build del solo host
da build dell'intera soluzione.

Per implementazione frontend: `npm --prefix frontend run build`, attendendo l'esito finale.
Niente avvio applicazione, verifiche browser o suite frontend aggiuntive senza richiesta esplicita.
Per test backend mirati su concorrenza e ownership leggere prima le
[istruzioni backend](../../AGENTS.md) e verificare l'isolamento dell'infrastruttura di test.

Per **questo aggiornamento solo documentale** sono previsti controllo dei link, coerenza con il
codice e `git diff --check`, senza build, test, applicazione migrazioni o avvio di servizi.

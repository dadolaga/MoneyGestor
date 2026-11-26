# Graphify per MoneyGestor

**Un comando per aggiornare Graphify e rigenerare la mappa di frontend, backend e collegamenti HTTP.**

Dalla radice del repository, in PowerShell:

```powershell
.\graphify.ps1
```

Per rigenerare e aprire subito la pagina iniziale:

```powershell
.\graphify.ps1 -Open
```

La pagina generata è [`.graphify/output/index.html`](../../.graphify/output/index.html).
Contiene quattro ingressi: frontend, backend, collegamenti API e progetto completo,
oltre a una tabella ricercabile che abbina client TypeScript, endpoint e handler C#.
Tutte le pagine HTML sono autonome: non richiedono un server, un CDN o una connessione
dopo la generazione. La libreria del visualizzatore è incorporata soltanto dopo aver
verificato l'hash di integrità dichiarato da Graphify.

## Gestione e risultati: due cartelle distinte

```text
graphify.ps1                         comando pubblico, versionato
.graphifyignore                      esclusioni, versionate
tools/graphify/                      gestione, versionata
  Invoke-Graphify.ps1                installazione, aggiornamento e comandi
  build.py                          estrazione, viste, verifiche e pubblicazione
  contracts.py                      collegamenti HTTP ricavati dagli AST
  overview.html                     modello della pagina iniziale
  test_contracts.py                  test isolati degli strumenti
  README.md                         questa guida
.graphify/                          tutto locale, ignorato da Git
  bootstrap/                        uv, quando non già disponibile nel PATH
  python/                           eventuale Python gestito da uv
  venv/                             ambiente Python con Graphify e dipendenze
  cache/                            cache dei pacchetti
  assets/                           libreria del visualizzatore verificata
  build/                            risultati in lavorazione
  last-run.json                     esito dell'ultima esecuzione
  output/                           ultima generazione completata
    index.html                      ingresso con viste e tabella HTTP
    graph.html / graph.json         grafo completo interattivo / interrogabile
    frontend/                       grafo frontend
    backend/                        grafo backend
    api/                            grafo dei collegamenti HTTP
    GRAPH_REPORT.md                 report Graphify con nomi delle comunità
    API_MAP.md                      tabella HTTP leggibile
    api-contracts.json              endpoint, client e riferimenti ai sorgenti
    build-info.json                 versione, data UTC, conteggi e impronta sorgenti
    installed-packages.txt          versioni effettive di tutte le dipendenze
```

"Fuori da Git" significa escluso dal versionamento, **non dentro la directory `.git`**:
i risultati rimangono nella cartella di lavoro `.graphify/`. Non vengono aggiunti al repository.
Gli strumenti non cambiano frontend, backend, database, dipendenze npm/NuGet o configurazioni globali.

## Cosa esegue il comando

1. Usa uv nel PATH oppure lo scarica dalla release ufficiale Astral per Windows x64.
2. Crea un ambiente isolato con un Python disponibile >= 3.10; uv può scaricarne uno
   se necessario. Non occorre attivare l'ambiente o installare Python nel PATH.
3. Aggiorna il pacchetto ufficiale **`graphifyy`** all'ultima versione stabile disponibile
   su PyPI, aggiornando le dipendenze richieste. Confronta poi la versione installata con
   quella pubblicata su PyPI: una vecchia versione compatibile con il Python locale non
   viene presentata come l'ultima. La versione effettiva compare nel risultato.
4. Esegue un'estrazione completa locale `--code-only --force` applicando `.graphifyignore`.
5. Aggiunge i collegamenti HTTP ricavati dai sorgenti, raggruppa le comunità con nomi
   basati sulle cartelle e genera le viste separate, il report e la pagina iniziale.
6. Verifica schema, unicità dei nodi, estremi dei collegamenti, corrispondenza delle richieste
   frontend con handler backend, integrità del visualizzatore e presenza degli artefatti.
7. Controlla che i sorgenti non siano cambiati durante la generazione, quindi pubblica
   gli artefatti in `output/`. Un errore di estrazione o verifica conserva l'output precedente.

Serve una connessione per la prima installazione e per cercare gli aggiornamenti.
Se l'aggiornamento fallisce, il comando termina con errore: non presenta la versione precedente
come aggiornata. Un aggiornamento futuro incompatibile con lo schema del grafo viene segnalato
esplicitamente e richiede l'adattamento di questi strumenti.

Per ricostruire tutto senza scaricare aggiornamenti, dopo almeno una generazione online riuscita:

```powershell
.\graphify.ps1 -Offline
```

## Consultazione quotidiana

```powershell
# Apri l'ultima generazione senza rigenerare.
.\graphify.ps1 Open

# Versione, data, conteggi, ultimo esito e modifiche ai sorgenti.
.\graphify.ps1 Status

# Cerca o spiega simboli nel grafo completo.
.\graphify.ps1 Query "TransactionsController"
.\graphify.ps1 Explain "apiClient.createTransaction"
.\graphify.ps1 Affected "apiClient.createTransaction"

# Segui un percorso attraverso frontend e backend.
.\graphify.ps1 Path "apiClient.createTransaction" "backend/logic/Commands/Transaction/AddTransactionCommand.cs::AddTransactionCommand" --undirected
```

I nomi possono essere ambigui: Graphify restituisce i candidati. Usa `percorso::simbolo`
o l'ID completo indicato nel risultato. Le query usano i nomi dei simboli, non un modello conversazionale.
Le opzioni aggiuntive sono inoltrate alla CLI; per esempio `Query "WalletsController" --budget 1000`.
Il wrapper seleziona sempre `.graphify/output/graph.json`, indipendentemente dalla directory corrente.

Codici di uscita: `0` successo; `1` errore; `2` sorgenti cambiati per `Status`;
`3` simbolo ambiguo e `4` nessun risultato per i comandi di consultazione Graphify.
`Status` confronta anche file nuovi non ignorati e modifiche locali non committate,
senza aprire `settings.json` o file privati esclusi. Non interroga PyPI: la ricerca
di una nuova versione avviene con la rigenerazione online.

## Cosa rappresenta la mappa

- **Frontend:** sorgenti Next.js/React/TypeScript, componenti, hook, modelli e client HTTP.
- **Backend:** sorgenti C#, controller, query, comandi, policy, entità EF, test e strumenti .NET.
- **API:** consumatori frontend → metodi `apiClient` → metodo HTTP e rotta → handler backend.
  I nodi "HTTP consumer" rappresentano file: non attribuiscono una chiamata a uno specifico callback.
  Ogni collegamento aggiunto riporta file e riga. Endpoint usati soltanto dal backend restano visibili.
- **Gestione:** script e configurazioni del repository, separati dalle viste applicative.

Le comunità sono algoritmiche e possono attraversare più cartelle; il loro nome indica la
cartella prevalente, non una separazione architetturale garantita. I filtri delle tre viste
mirate, invece, selezionano le aree effettive. EXTRACTED indica evidenza esplicita nei sorgenti;
INFERRED indica risoluzione dello strumento. Nessuna relazione prova il comportamento a runtime.

L'integrazione HTTP supporta le forme attuali: attributi di route sui controller V1,
attributi `HttpGet/Post/Put/Patch/Delete`, client `send({ method, url })`, chiamate `http.get`,
URL letterali e template con parametri, funzioni esportate nel client e chiamate `apiClient.nome`.
Le forme dinamiche non riconosciute nel client fanno fallire la generazione; nuove convenzioni
di routing o alias del client richiedono di estendere l'estrattore e i relativi test.
La grammatica C# può non comprendere alcuni costrutti moderni nei corpi dei metodi:
per il ponte HTTP vengono lette e controllate rotte e firme, non interpretati quei corpi.

La modalità automatica è deliberatamente **solo codice**: Markdown, immagini e PDF non
ricevono analisi semantica. Le guide rimangono consultabili nel repository. Non vengono
usati modelli, chiavi API, servizi cloud, database live o dati finanziari.
Il tool non installa hook Git né riscrive automaticamente le istruzioni degli assistenti.

## Verifica degli strumenti

```powershell
.\.graphify\venv\Scripts\python.exe -m unittest discover -s tools/graphify -p "test_*.py" -v
```

Sono test della gestione Graphify con sorgenti sintetici e directory temporanee;
non avviano l'applicazione, test frontend, .NET o database. La generazione esegue
inoltre controlli sul grafo reale. Le normali verifiche frontend/backend restano quelle
definite negli `AGENTS.md` e non vengono lanciate da Graphify.

Se PowerShell blocca gli script per la policy locale, l'equivalente per questa singola esecuzione è:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\graphify.ps1
```

Su reti aziendali uv usa gli attestati TLS del sistema; non viene disabilitata la verifica TLS.
Per errori di rete o permessi, correggi la causa e riesegui il comando. Lo stato dell'ultima
esecuzione è in `.graphify/last-run.json`; un output precedente può essere ancora disponibile.

Riferimenti: [progetto ufficiale](https://github.com/Graphify-Labs/graphify),
[CLI](https://docs.graphify.com/open-source/configuration/cli),
[esclusioni](https://docs.graphify.com/open-source/configuration/ignoring-files).

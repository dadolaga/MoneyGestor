# Riprogettazione delle migrazioni del backend

Stato: implementato il 18 ottobre 2026. Schema database `1`, formato archivio `1`.

L'applicazione è usata dal proprietario e dalla famiglia: una finestra di manutenzione
è accettabile. La prima installazione può partire da un database vuoto, senza importare
i dati del vecchio backend. Gli aggiornamenti successivi conserveranno i dati tramite
export/import versionato, eseguito manualmente su un nuovo database.
Il processo sostituisce il precedente bootstrap e le migrazioni incrementali EF.

## Processo concordato

1. All'avvio, il backend verifica la versione del database in sola lettura.
2. Se non è quella richiesta, termina senza modificare nulla e richiede un intervento manuale.
3. Con l'applicazione e tutti i processi di scrittura fermi, si esportano i dati.
4. Si prepara un nuovo database con lo schema corrente e si importano i dati convertiti.
5. Dopo le verifiche, si configura manualmente l'applicazione per usare il nuovo database.

Il database originale resta disponibile per recupero. La sua cancellazione è
un'operazione successiva ed esplicita, separata dall'aggiornamento.
Non sono previsti aggiornamenti incrementali dello schema del database in uso.

## Controllo all'avvio

Conservare la versione dello schema in una piccola tabella di metadati; la versione
attesa è definita dalla release del backend.

- Database o versione mancanti: terminare e richiedere l'inizializzazione manuale.
- Versione precedente: terminare con codice di uscita non zero, indicando versione
  trovata, versione richiesta e necessità dell'aggiornamento manuale.
- Versione più recente o sconosciuta: terminare indicando l'incompatibilità.
- Versione corretta: verificare dati riservati e integrità finanziaria in sola lettura,
  riutilizzando i controlli esistenti, prima di accettare richieste.

L'avvio non modifica schema, metadati o seed e non avvia procedure interattive.
I messaggi operativi sono in inglese e non contengono credenziali.
La versione dichiarata non sostituisce i controlli d'integrità.

## Export versionato

Usare un archivio ZIP con `manifest.json` e più file CSV UTF-8. Il formato descrive
esplicitamente i dati logici dell'applicazione ed è indipendente dal motore database.

| Campo del manifest | Scopo |
| --- | --- |
| `formatVersion` | Versione delle colonne e del significato dei CSV |
| `schemaVersion` | Versione del database sorgente |
| `applicationVersion` | Release che ha prodotto l'export |
| `exportedAtUtc` | Data e ora dell'esportazione |
| `files` | File attesi, conteggio righe e checksum SHA-256 di ciascuno |

Versione dello schema e versione del formato restano distinte: una modifica agli
indici può cambiare lo schema senza cambiare i CSV.

Esportare tutti i dati persistenti necessari: utenti e altri dati Identity, colori,
categorie, portafogli, movimenti e relative relazioni. La cronologia tecnica delle
migrazioni e i metadati della sorgente non diventano lo stato del nuovo database.
Definire convenzioni univoche per intestazioni, escaping, null, ID, decimali esatti,
date di calendario e timestamp UTC. Conservare ID, proprietari e collegamenti,
senza arrotondamenti, troncamenti o correzioni finanziarie implicite.

L'archivio include dati personali e hash delle password: conservarlo in uno spazio
protetto e non registrarne i contenuti nei log. Le chiavi Data Protection restano
una risorsa separata da preservare; l'export non garantisce la continuità delle sessioni.

## Import e conversione delle versioni

L'export viene prodotto dallo strumento compatibile con il database sorgente,
prima di sostituire la vecchia release. Il nuovo importatore legge l'archivio;
non usa i Models correnti per interrogare uno schema vecchio.

La prima implementazione supporta soltanto il formato `1` e rifiuta esplicitamente
gli altri. Quando il formato cambierà, aggiungere una
conversione semplice come `v1 -> v2`, riutilizzabile nella sequenza `v1 -> v2 -> v3`.
Se il formato resta uguale, non serve un nuovo convertitore. Versioni sconosciute,
più recenti o prive di un percorso completo vengono rifiutate prima di scrivere dati.

L'importazione prepara sempre lo schema della release corrente in una destinazione
vuota, esplicitamente distinta dalla sorgente. Non sovrascrive database popolati.
Conserva anche i dati globali esportati e verifica gli ID riservati: il seed della
prima installazione non deve sovrascriverli. Ricrea le relazioni nell'ordine necessario
e riallinea i generatori degli ID per consentire nuovi inserimenti.

Prima del successo, verificare file attesi, checksum, colonne, conteggi, ID,
relazioni, ownership, saldi e coppie di trasferimento. Eventuali variazioni dei
conteggi devono essere previste esplicitamente dai convertitori.
La versione nella tabella di metadati viene impostata soltanto dopo importazione
e verifiche riuscite, nella stessa transazione dei dati. La creazione dello schema
resta fuori dalla transazione: dopo un errore possono rimanere tabelle vuote,
ma il database incompleto non può avviare il backend.

Un errore termina il processo senza cambiare la configurazione dell'applicazione.
La destinazione incompleta resta da ispezionare; un nuovo tentativo usa un'altra
destinazione vuota. Per la prima versione non servono ripresa automatica o import parziale.

## Strumento manuale e recupero

Lo strumento amministrativo è separato dal server HTTP e offre quattro operazioni:

- **Inizializzazione:** crea lo schema corrente e i dati globali su una destinazione
  vuota; imposta la versione soltanto dopo le verifiche, per la prima installazione.
- **Export:** legge un database compatibile e produce l'archivio completo.
- **Import:** controlla l'archivio, prepara lo schema corrente, converte e importa
  i dati su una destinazione vuota, poi esegue le verifiche.
- **Delete:** cancella definitivamente il database selezionato, incluse tutte le
  tabelle e i dati, dopo la conferma digitando il suo nome esatto. Serve anche per
  eliminare una destinazione incompleta o con una versione non più compatibile.

Usare destinazioni esplicite e credenziali amministrative separate da quelle dell'API,
che non necessita di permessi DDL. Un processo alla volta, con l'applicazione ferma,
è sufficiente: niente aggiornamenti automatici o scritture contemporanee su due database.
Il cambio di database nella configurazione resta manuale, dopo l'import riuscito.

### Comandi

Eseguire dalla radice del repository. Predisporre prima un database MySQL esistente
e vuoto per inizializzazione/import. Fornire privatamente
`MONEYGESTOR_ADMIN_CONNECTION_STRING` al processo: non viene letto alcun file
di impostazioni e il database nella connessione deve corrispondere a `--database`.

```powershell
# Prima installazione: connessione amministrativa al database vuoto moneygestor_v1.
dotnet run --project backend/ExportImportApplication -- initialize --database moneygestor_v1

# Prima di sostituire la release: applicazione ferma, connessione alla sorgente.
dotnet run --project backend/ExportImportApplication -- export --database moneygestor_v1 --file family-v1.zip --maintenance

# Nuova release: connessione aggiornata privatamente verso una destinazione vuota.
dotnet run --project backend/ExportImportApplication -- import --database moneygestor_new --file family-v1.zip

# Cancellazione esplicita, con applicazione ferma e connessione al database da eliminare.
dotnet run --project backend/ExportImportApplication -- delete --database moneygestor_old
```

`--maintenance` dichiara che tutte le scritture sulla sorgente sono ferme; il tool
non arresta l'applicazione. I nomi sono esempi: scegliere la destinazione reale e
verificarla prima del comando. Un archivio esistente non viene sovrascritto.
Il codice di uscita è `0` per successo, `1` per errore/cancellazione, `2` per uso
o configurazione iniziale non validi. In caso di errore, nessuna destinazione viene
promossa; eventuali file parziali restano da ispezionare.

`delete` mostra server, porta e database, poi richiede di digitarne il nome esatto:
una risposta diversa o l'assenza di risposta annulla la cancellazione. La connessione
deve corrispondere a `--database` e l'utenza deve avere il permesso `DROP`.
I database di sistema sono rifiutati. Il comando elimina il database stesso:
prima di un successivo `initialize` o `import` occorre predisporre nuovamente
un database vuoto. Nessuna cancellazione viene eseguita automaticamente dagli altri comandi.

È possibile distribuire la CLI compilata con la release. Conservare la versione
precedente dello strumento per esportare prima di un aggiornamento; non leggere
uno schema vecchio con il nuovo modello EF. L'importatore carica i dati in memoria:
è pensato per questo utilizzo familiare, con un limite di 256 MiB per CSV e 1 GiB
complessivo non compresso. Ogni campo CSV è limitato a 1 MiB.

Conservare un backup verificato della sorgente: i checksum dell'export non dimostrano
che sia ripristinabile. Fino alla riapertura del servizio, il recupero consiste nel
ricollegare il database originale alla precedente release compatibile. Dopo nuove
scritture, tornare all'originale perderebbe quelle operazioni e richiede una valutazione esplicita.

Il formato logico facilita un futuro passaggio a PostgreSQL, ma serviranno comunque
provider EF, tipi e creazione dello schema compatibili. Quel supporto è fuori dalla
prima implementazione.

## Implementazione e verifica

Sono mantenuti EF Core, [database/Models](../database/Models),
[MoneyGestorContext](../database/MoneyGestorContext.cs), Identity numerico e
le API `/api/v1`. EF continua a mappare i dati e preparare lo schema corrente con
`EnsureCreatedAsync` esclusivamente sulla destinazione verificata vuota. La vecchia
cartella delle migrazioni, lo snapshot e la factory design-time sono stati rimossi.
La versione è gestita da [DatabaseSchema](../database/DatabaseSchema.cs).

Migrazioni e seed automatici all'avvio e la relativa opzione di configurazione
sono stati rimossi. [ExportImportApplication](../ExportImportApplication/Program.cs)
contiene la nuova CLI; il precedente importatore è stato eliminato.
Gli [strumenti di backup/ripristino](../../ops/database) usano ora i metadati di
versione e l'inventario del modello unificato, senza `user`, `login` o cronologia EF.

I [test dedicati](../DatabaseTransferTests) coprono il formato CSV, la completezza
dei dati esportati rispetto al modello, archivi corrotti e versioni non supportate,
inizializzazione, versioni database incompatibili, round-trip, credenziali Identity,
nuovi ID, import fallito e cancellazione esplicitamente confermata. Le integrazioni usano soltanto MySQL Testcontainers
con risorse casuali `mg_test_*` e controllo di proprietà prima della rimozione.
I controlli iniziali sono verificati anche con un account MySQL che dispone soltanto
del permesso `SELECT`.

```powershell
dotnet test backend/DatabaseTransferTests/DatabaseTransferTests.csproj
```

Il progetto di test storico contiene ancora consumatori di API rimosse da precedenti
refactoring e impedisce la build completa della soluzione; i test dedicati sono
separati per mantenere verificabile questo flusso. Il recupero operativo con cambio
manuale di configurazione e il drill PowerShell restano da esercitare nell'ambiente
di destinazione. Non è stato aggiornato o cancellato alcun database applicativo.

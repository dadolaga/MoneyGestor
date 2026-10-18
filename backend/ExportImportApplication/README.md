# MoneyGestor database tools

CLI per inizializzare un database, esportare/importare archivi ZIP e cancellare
esplicitamente un database. Richiede .NET 10 e funziona da terminale su Windows e Linux.
I messaggi operativi sono in inglese, come nel resto del backend.

## Da dove iniziare

Dalla radice del repository, aprire la guida generale oppure quella di un comando:

```text
dotnet run --project backend/ExportImportApplication -- --help
dotnet run --project backend/ExportImportApplication -- export --help
```

Anche l'avvio senza argomenti mostra la guida, senza accedere a MySQL.
Sono disponibili gli alias `-h` e `help`, incluso `help export`.
La guida viene scritta su stdout; gli errori su stderr, con il motivo e il comando
per consultare la sintassi corretta.

## Quale comando usare

| Obiettivo | Comando e argomenti |
| --- | --- |
| Prima installazione, con creazione del database se manca | `initialize --database moneygestor_new` |
| Salvare tutti i dati della sorgente in un nuovo archivio con nome automatico | `export --database moneygestor_source --maintenance` |
| Ripristinare l'archivio, con creazione del database se manca | `import --database moneygestor_new --file family.zip` |
| Eliminare definitivamente un database | `delete --database moneygestor_old` |

Anteporre `dotnet run --project backend/ExportImportApplication --` a ciascun comando.
I nomi sono esempi: verificare sempre il database reale.

`initialize` e `import` creano automaticamente il database selezionato se manca.
Se esiste già deve essere vuoto: le tabelle esistenti non vengono sovrascritte o
cancellate. L'utente amministrativo deve avere i permessi per creare il database
e lo schema. MySQL deve essere già installato e raggiungibile. L'import valida
l'archivio prima di creare la destinazione. L'export e l'avvio del server non
creano né inizializzano database.

- `--database NAME` è obbligatorio: è il nome MySQL, non il server o un percorso.
  Deve corrispondere esattamente al campo `Database` della connessione amministrativa.
- `--file PATH` è facoltativo per export e obbligatorio per import. Se omesso in
  export, il file viene creato nella directory corrente (`.`), con nome
  `export-yyyy-MM-dd-HHmmss.zip` e data/ora UTC, per esempio
  `export-2026-10-18-143025.zip`. Il percorso scelto compare nel riepilogo.
  L'export crea un nuovo ZIP senza sovrascrivere file esistenti, anche in caso
  di nomi automatici coincidenti; l'import legge un archivio già presente.
  Racchiudere tra virgolette i percorsi con spazi: `--file "backups/family data.zip"`.
  I percorsi relativi partono dalla directory di lavoro del processo.
- `--maintenance` è obbligatorio solo per export: dichiara che l'applicazione e
  tutti gli altri processi di scrittura sono già fermi. Non li arresta automaticamente.

Fornire privatamente `MONEYGESTOR_ADMIN_CONNECTION_STRING` nell'ambiente del processo.
Non passare credenziali negli argomenti. Non viene letto alcun file di impostazioni.
La guida include la sintassi PowerShell e Bash per assegnare una connessione
già fornita privatamente in una variabile, senza incorporare password negli esempi.

Prima dell'esecuzione vengono mostrati operazione, server, porta, database e percorso
dell'archivio, senza stampare utente o password. `delete` richiede ancora di digitare
il nome esatto del database; Invio vuoto, fine input o un nome diverso annullano.

## Colori e compatibilità

La CLI usa `ConsoleColor` di .NET, senza dipendenze aggiuntive, comandi di shell o
caratteri grafici speciali. Titoli ciano, avvisi gialli, errori rossi e successi verdi
sono accompagnati da testo e indicatori leggibili anche senza colori.

I colori vengono disabilitati per ogni flusso reindirizzato verso file o pipe,
quando `NO_COLOR` ha un valore non vuoto, quando `TERM=dumb`, oppure con `--no-color`:

```text
dotnet run --project backend/ExportImportApplication -- export --help --no-color
```

`--no-color` può precedere o seguire il comando. Non serve una console interattiva
per leggere l'help o eseguire initialize/export/import; la cancellazione conserva
la conferma tramite input standard. Non vengono usati spinner o riposizionamenti
del cursore, così l'output resta leggibile anche nei log.

Codici di uscita: `0` successo o guida, `1` errore operativo/cancellazione,
`2` argomenti o configurazione iniziale non validi.

Per prerequisiti, protezione degli archivi e recupero consultare la
[guida alle migrazioni manuali](../docs/database-migration-redesign.md).

# Deployment e recovery del database

Questa procedura è il runbook operativo introdotto da DB-21. Si applica al database MySQL 8.4 che ospita sia lo
schema MoneyGestor storico sia ASP.NET Core Identity.

## Modalità di bootstrap

`database.bootstrapMode` accetta tre valori:

- `Disabled` è il default fail-closed: non crea database e non applica migration. Lo startup passa soltanto se entrambi
  i context sono già aggiornati; il seed globale idempotente viene comunque verificato/applicato.
- `Migrate` crea il database se assente e applica le migration pendenti di MoneyGestor e Identity. Rifiuta uno schema
  legacy privo della baseline, per evitare `CREATE TABLE` accidentali su dati esistenti.
- `MigrateAndAdoptLegacy` abilita anche l'adozione controllata dello schema storico. Va usato per un solo deployment,
  dopo backup e prova di restore, e poi sostituito con `Disabled` o `Migrate`.

La creazione da zero richiede `CREATE DATABASE`. L'adozione crea inoltre un database probe temporaneo
`mg_db21_probe_<guid>` e richiede `CREATE`/`DROP DATABASE`; il probe contiene soltanto lo schema baseline, viene
confrontato tramite `INFORMATION_SCHEMA` e viene eliminato anche in caso di errore. Nessun dato applicativo viene
copiato nel probe o scritto nei log.

## Nuova installazione

1. Predisporre l'utente MySQL con i privilegi necessari sul database configurato e, se il database non esiste,
   autorizzarne la creazione.
2. Impostare `database.bootstrapMode` a `Migrate`.
3. Avviare una sola istanza del backend. Lo startup crea/applica prima la baseline MoneyGestor, poi le migration
   Identity, esegue il seed e infine i preflight di integrità.
4. Verificare nei log soltanto outcome e numero di migration, quindi riportare la modalità alla policy scelta.

## Adozione di un database legacy

1. Fermare le scritture e creare un backup consistente esterno al server applicativo.
2. Ripristinare il backup in staging e provare integralmente questa procedura prima del database reale.
3. Impostare `database.bootstrapMode` a `MigrateAndAdoptLegacy` e avviare una sola istanza.
4. Il preflight confronta tabelle, colonne (tipo, unsigned, nullability, default, extra, charset/collation), indici,
   chiavi esterne e delete/update rule. Se qualsiasi sezione differisce, lo startup si ferma e non modifica la history.
5. Solo con equivalenza completa viene registrata `20260924185824_CreateLegacySchema`; i dati e lo schema legacy non
   vengono modificati. Le eventuali migration successive vengono quindi applicate normalmente.
6. Verificare utenti, wallet, movimenti, login e seed globali; poi rimuovere la modalità di adozione.

## Deployment controllato senza auto-migration

Impostare `MONEYGESTOR_DESIGN_CONNECTION_STRING` in un ambiente amministrativo protetto e revisionare lo script prima
di applicarlo:

```powershell
$env:MONEYGESTOR_DESIGN_CONNECTION_STRING = '<connection-string-protetta>'
dotnet ef migrations script --project backend/database/database.csproj --context MoneyGestorContext
dotnet ef database update --project backend/database/database.csproj --context MoneyGestorContext
dotnet ef database update --project backend/database/database.csproj --context IdentityAccountContext
```

La baseline SQL revisionata è conservata in
[`evidence/DB-21_CreateLegacySchema.sql`](evidence/DB-21_CreateLegacySchema.sql). Non applicarla manualmente a uno
schema legacy esistente: per quel caso usare il preflight di adozione.

## Rollback e recovery

- L'adozione baseline non cambia dati o schema. Se fallisce, correggere la divergenza solo dopo analisi; non inserire
  manualmente la riga di history.
- Non eseguire il `Down` della baseline su un database con dati: elimina tutte le tabelle MoneyGestor.
- Per una migration futura, usare il rollback EF soltanto se il relativo `Down` è stato revisionato e provato sulla
  copia di staging. In caso di DDL parzialmente applicato o rollback non sicuro, fermare il backend, ricreare il
  database e ripristinare il backup verificato.
- Dopo il restore, lasciare `bootstrapMode=Disabled`, confrontare schema/history e integrità, quindi riaprire il
  traffico. Il backup è valido solo se il restore di prova ha verificato conteggi, vincoli e funzionalità critiche.


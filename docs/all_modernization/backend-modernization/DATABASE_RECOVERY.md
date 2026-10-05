# Runbook backup e recovery MySQL

Questo runbook gestisce una singola installazione MoneyGestor con MySQL 8.4 esterno. Gli script in `ops/database` sono
strumenti amministrativi avviati manualmente; non c'è un job pianificato o un container MySQL in Compose. La CLI ZIP/CSV
storica è disabilitata.

## Perimetro e protezione

Gli script richiedono PowerShell 7 e i client MySQL 8.4 (`mysql`, `mysqldump`) disponibili in `PATH`.

Il dump include tutte le tabelle dello schema configurato, incluse ASP.NET Identity, utenti legacy, hash password,
movimenti, migration history, trigger, eventi e routine. Non contiene account/grant globali MySQL, configurazione server,
key-ring ASP.NET, segreti SMTP o settings. Un restore richiede l'operatore a predisporre separatamente tali risorse.

I backup contengono dati personali e hash credenziali. Conservare soltanto su volume cifrato con ACL limitate; usare
canale di trasferimento cifrato e retention approvata dal titolare. Il manifest SHA-256 verifica corruzione accidentale,
non autenticità o confidenzialità. Non archiviare dump in Git, cartelle web o log. Le credenziali si forniscono tramite
MySQL `login-path`; non usare password in parametri o variabili in chiaro.

Preparare un account MySQL operativo distinto per backup e restore, con privilegi minimi sul solo schema e capacità di
creare un database staging. Conservare il login-path con i permessi filesystem dell'account operativo; l'obfuscation
di `mysql_config_editor` non è cifratura.

```powershell
mysql_config_editor set --login-path=client --host=127.0.0.1 --port=3306 --user=moneygestor_ops --password
```

Il comando richiede la password interattivamente. Configurare TLS/verifica certificato secondo la topologia MySQL
prima di operare su rete non locale.

## Creare e verificare un backup

Mettere in pausa ogni DDL/migration per la durata del dump. Con tutte le tabelle InnoDB le scritture applicative possono
continuare grazie a `--single-transaction`; tabelle non InnoDB sono rifiutate. Il backup viene pubblicato come directory
`.mgbak` solo dopo dump non vuoto, SHA-256, byte length e manifest.

```powershell
pwsh -File ./ops/database/New-MoneyGestorBackup.ps1 `
  -Database moneygestor_db `
  -LoginPath client `
  -Server 127.0.0.1 `
  -Port 3306 `
  -OutputDirectory E:\MoneyGestorBackups
```

Proteggere/replicare insieme `database.sql` e `manifest.json`. Una copia isolata può essere controllata confrontando
`dumpLengthBytes` e `dumpSha256` del manifest. Non usare lo storico archivio ZIP/CSV.

## Restore senza modificare il database live

1. Dichiarare maintenance e bloccare login/scritture applicative per il cutover futuro. Il restore staging iniziale può
   essere preparato in anticipo su un server compatibile.
2. Scegliere un nome nuovo e non esistente con prefisso `mg_restore_`; lo script rifiuta ogni altro nome.
3. Verificare il backup e ripristinare nel database staging. Lo script lascia staging intatto in caso d'errore per
   permettere l'ispezione; non promuoverlo e rimuoverlo manualmente solo dopo aver conservato l'evidenza necessaria.

```powershell
pwsh -File ./ops/database/Restore-MoneyGestorToStaging.ps1 `
  -BackupPath E:\MoneyGestorBackups\moneygestor-20260927T120000Z.mgbak `
  -StagingDatabase mg_restore_drill_20260927 `
  -LoginPath client `
  -Server 127.0.0.1 `
  -Port 3306
```

Prima del cutover il tool verifica format version, percorso fisso, dimensione, SHA, charset/collation ammessi, inventory
tabelle, migration history e `CHECK TABLE`. Non esegue migration e non fa switch automatico. Un fallimento lascia il DB
live inalterato e lo staging non promosso.

## Cutover e rollback

MySQL non offre uno swap atomico dell'intero schema. Evitare `RENAME TABLE` sequenziali o drop del database sorgente.

1. Programmare la finestra di maintenance e fermare ogni istanza backend che può scrivere.
2. Verificare di avere un backup precedente verificato e completato il restore staging.
3. Usare la configurazione deployment protetta per puntare `database.name` allo schema `mg_restore_*`; mantenere
   `bootstrapMode=Disabled` durante il recupero. Non stampare né copiare settings/secret nel ticket o nei log.
4. Avviare una sola istanza e fare smoke check controllati: health/startup, login test, lettura di wallet e movimenti,
   riconciliazione saldo read-only. Evitare mutazioni reali, email o notifiche durante la prova.
5. Se lo smoke check fallisce, fermare subito l'app e ripristinare la configurazione al nome schema originale; riavviare
   e verificare che il database originale sia tornato operativo. Lo schema staging resta disponibile per indagine.
6. Se passa, riaprire il traffico. Conservare lo schema originale secondo retention e cancellarlo soltanto con procedura
   separata, approvata e verificata da un operatore.

Registrare timestamp, operatori, versione app/MySQL, nome backup (senza path sensibile), esito hash/inventory,
durata delle fasi, smoke check, esito rollback/cutover, storage e cleanup differito. Non registrare password, PII o dump.
Calcolare RPO/RTO dai tempi osservati; non dichiarare valori finché non misurati.

## Recovery drill isolato

Preparare un server MySQL 8.4 effimero o un'istanza self-hosted dedicata, più uno schema fixture sacrificabile con nome
`mg_drill_*`. Il fixture va creato da dati sintetici oppure da un backup protetto ripristinato in uno schema
`mg_restore_*`. Non passare mai lo schema live allo script drill.

```powershell
pwsh -File ./ops/database/Invoke-MoneyGestorRecoveryDrill.ps1 `
  -DrillSourceDatabase mg_restore_fixture01 `
  -LoginPath client `
  -Server 127.0.0.1 `
  -Port 3306 `
  -OutputDirectory E:\MoneyGestorDrill
```

Lo script produce un backup, lo ripristina in un nuovo `mg_restore_*`, controlla inventory, migration history e tabelle,
e salva un report JSON. Per chiudere il drill, puntare una istanza applicativa isolata allo schema ripristinato, fare gli
smoke check read-only, provare il ritorno alla configurazione precedente e verificare entrambi gli schemi. Il cleanup è
manuale e fuori dallo script; registrare esito e RPO/RTO misurati nell'evidenza datata BAK-43.

## Limiti

- È un dump logico dell'intero schema, non un backup del server MySQL, utenti/grant, key-ring o settings.
- SHA-256 non sostituisce cifratura, firma o controllo d'accesso.
- I trigger/eventi/routine sono inclusi; verificare che i privilegi del nodo consentano di ripristinarli.
- DDL concorrente durante `mysqldump` è vietato dalla procedura.
- Non c'è schedulazione, monitoraggio retention automatico o SLA finché OBS-50/CI-53 non forniscono tali controlli.

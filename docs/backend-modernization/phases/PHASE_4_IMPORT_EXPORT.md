# Fase 4 — backup MySQL e recovery controllato

DEC-08 è stata sostituita il 27 settembre 2026. L'ambito approvato è il backup logico dell'intero schema MySQL e il
restore isolato con cutover e rollback operati esplicitamente. La CLI ZIP/CSV storica resta disabilitata; i nuovi
strumenti sono script amministrativi separati e non fanno parte del runtime applicativo. Runbook: [DATABASE_RECOVERY.md](../DATABASE_RECOVERY.md).

## BAK-40 — Disabilitazione fail-closed della CLI ZIP/CSV legacy

**Stato:** completato il 27 settembre 2026

Il vecchio entry point termina sempre con exit code 2 e `feature_disabled` prima di leggere argomenti, configurazione,
filesystem, rete o database. Non c'è flag o variabile di riattivazione. Il servizio `importexport` è rimosso da Compose.
La ricerca dei consumer copre codice, docs, script e workflow del repository; eventuali automazioni esterne vanno
dismesse prima del rilascio.

File: `backend/ExportImportApplication/Program.cs`, `docker-compose.yml`, test processo
`LegacyImportExportCliDisabledTest.cs`, README e guide operative.

Completamento: processi export/import/arbitrary args producono lo stesso rifiuto, senza settings o file; Compose e
release non distribuiscono il servizio legacy. Verifica manuale e build prima di aggiornare lo stato.

## BAK-41 — Dump consistente e formato manifestato

**Stato:** completato il 29 settembre 2026

Il requisito approvato è il recovery dell'intero schema self-hosted, incluse tabelle MoneyGestor legacy e ASP.NET
Identity. Il formato `moneygestor-mysql-logical-backup` v1 è una directory `.mgbak` con `database.sql` e `manifest.json`.
Il manifest contiene origine, versione MySQL, collation, inventory tabelle, lunghezza, SHA-256 e indicazione dei dati
sensibili. `mysqldump --single-transaction` richiede tutte le tabelle InnoDB e DDL sospeso durante l'operazione.

File: `ops/database/MoneyGestor.DatabaseTools.psm1`, `New-MoneyGestorBackup.ps1` e
`docs/backend-modernization/DATABASE_RECOVERY.md`.

Lo SHA-256 rileva corruzione accidentale, non autentica il backup. Il file contiene PII e hash password; cifratura del
volume, permessi, trasferimento e retention sono responsabilità dell'operatore. Non si inventa cifratura proprietaria.

Completamento: dump e manifest pubblicati atomicamente solo a conclusione; hash/byte length verificabili; round-trip su
MySQL 8.4; verifica dell'inventory e delle tabelle supportate.

## BAK-42 — Restore staging, cutover e rollback

**Stato:** completato il 29 settembre 2026

Il restore accetta solo un backup v1 integro e un nuovo schema col prefisso `mg_restore_`. Non modifica o elimina il DB
sorgente e rifiuta target già esistenti. Dopo restore confronta inventory, migration history e `CHECK TABLE`. Solo dopo
la convalida l'operatore può fermare l'applicazione, cambiare il nome database nella configurazione protetta e avviare
lo smoke check. Il DB precedente resta integro come rollback. Non si usa `RENAME TABLE` come falso swap atomico.

File: `ops/database/Restore-MoneyGestorToStaging.ps1` e `DATABASE_RECOVERY.md`.

Completamento: test end-to-end su DB effimero, failure injection, rifiuto target preesistente, staging validato e prova
di cutover/rollback senza perdita o modifica del sorgente.

## BAK-43 — Operatività e recovery drill

**Stato:** completato il 29 settembre 2026

`Invoke-MoneyGestorRecoveryDrill.ps1` automatizza backup e restore a partire solo da schema sacrificabile `mg_drill_*`;
il test crea un secondo schema `mg_restore_*` e non elimina database. La guida definisce maintenance, cambio
configurativo, smoke check applicativo, rollback, storage, retention e registrazione di RPO/RTO osservati. MySQL non
entra in Compose e il drill non deve usare database di produzione.

Completamento: drill eseguito su MySQL 8.4 effimero, con API sorgente e staging avviate e rollback verificato;
registrare il drill in [evidenza datata BAK-41..43](../evidence/BAK-41_43_2026-09-29.md).


## Gate della fase

La fase è completata il 29 settembre 2026: BAK-40..43 hanno evidenza verificabile, incluso round-trip e rollback su database
isolato. Il database sorgente non viene mai eliminato automaticamente e non si fanno claim di RPO/RTO prima di
misurarli.

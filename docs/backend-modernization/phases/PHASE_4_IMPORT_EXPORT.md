# Fase 4 — blocco import/export

DEC-08 sospende l'intera funzionalità. Questa fase contiene un solo intervento eseguibile: rendere la CLI fail-closed e
assente dal deployment. Formato, import staging e recovery drill non vanno modernizzati finché il proprietario non
riapre una decisione di prodotto.

## BAK-40 — Disabilitazione fail-closed della CLI

**Stato:** non iniziato

**Priorità:** P0

**Obiettivo**

Impedire qualsiasi export/import prima che il processo legga configurazione, apra MySQL o tocchi archivi.

**Situazione attuale**

`ExportImportApplication` espone operazioni che possono leggere dati e sostituire database/tabelle. Non esistono una
barriera di prodotto affidabile, dry-run completo o test di recovery sufficienti.

**Motivazione**

Il proprietario ha deciso di bloccare la feature. Lasciare un percorso eseguibile sarebbe un rischio distruttivo senza
beneficio corrente.

**Prerequisiti**

- DEC-08;
- TST-01 per eseguire in sicurezza gli eventuali test che dimostrano l'assenza di accesso DB.

**File coinvolti**

- entry point e progetto `backend/ExportImportApplication`;
- `docker-compose.yml` e file di deployment/release;
- documentazione e script che invocano la CLI;
- test di processo/guardia senza accesso a settings o MySQL.

**Istruzioni operative**

1. Inserire come prima istruzione effettiva dell'entry point un blocco non aggirabile che termina con exit code non zero
   e messaggio stabile `feature_disabled`.
2. Il blocco deve avvenire prima del binding di `IMPORT_EXPORT_APP_SETTINGS`, della lettura di `settings.json`, della
   costruzione del `DbContext` e di qualunque accesso a file/archivi.
3. Non prevedere un flag pubblico, variabile ambiente o argomento “temporaneo” che riabiliti la feature.
4. Rimuovere il servizio/command CLI da Compose, immagini, workflow, script e procedure di release. Il progetto può
   compilare come riferimento storico, ma non viene pubblicato come artefatto eseguibile supportato.
5. Aggiornare help e documentazione: import/export non disponibile; MySQL resta esterno e la protezione dei dati segue
   procedure DB indipendenti da questa CLI.
6. Aggiungere un test di processo con settings inesistenti e MySQL irraggiungibile: deve ottenere sempre lo stesso
   rifiuto senza tentativi di connessione o creazione file.
7. Cercare tutti i consumer nel repository e documentare eventuali riferimenti esterni che il proprietario dovrà
   dismettere.

**Vincoli**

- nessuna lettura di `settings.json` nei test o nel percorso bloccato;
- nessun accesso a database, filesystem di backup o rete;
- nessuna cancellazione immediata del codice storico senza ricerca consumer dedicata;
- il blocco non sostituisce una strategia di backup MySQL operativa futura.

**Rischi**

- un secondo entry point o script può aggirare il blocco;
- pipeline esterne non presenti nel repository possono continuare a invocare vecchi binari;
- un test che si limita all'exit code potrebbe non rilevare side effect precedenti.

**Verifiche**

- test di processo con sentinelle su configurazione, rete e directory temporanea;
- ricerca repository di `ExportImportApplication`, comandi import/export e relativo servizio Compose;
- build soluzione;
- ispezione degli artefatti di publish/release;
- log senza path sensibili, connection string o contenuto degli archivi.

**Criteri di completamento**

- ogni comando termina fail-closed prima di qualunque side effect;
- nessun deployment o workflow distribuisce/esegue la CLI;
- documentazione dichiara chiaramente la feature non disponibile;
- riabilitazione possibile soltanto con una modifica di codice e nuova decisione approvata.

## BAK-41 — Formato ed export consistente

**Stato:** bloccato da DEC-08

**Priorità:** P1

**Obiettivo**

Definire eventualmente un formato portabile e un export consistente, ma solo dopo una nuova decisione di prodotto.

**Situazione attuale**

Il formato storico non offre garanzie sufficienti; la feature è disabilitata.

**Motivazione**

Non è corretto investire in un formato senza sapere se il bisogno futuro sarà backup, portabilità utente o tooling di
sviluppo.

**Prerequisiti**

- nuova decisione che sostituisce DEC-08 e definisce scopo, dati, sicurezza, compatibilità e retention;
- DB-21, DAT-22 e DAT-23 completati se il nuovo requisito include dati persistenti.

**File coinvolti**

- da ridefinire nella nuova decisione; nessun file autorizzato ora.

**Istruzioni operative**

1. Non implementare questo step.
2. Alla riapertura, riscrivere la scheda in base al requisito reale e rivalutare formato, cifratura, consistenza e
   compatibilità.

**Vincoli**

- BAK-40 resta attivo finché il nuovo workstream non supera i propri gate.

**Rischi**

- riutilizzare il formato storico per inerzia può ricreare i rischi già rilevati.

**Verifiche**

- nessuna finché lo step è bloccato.

**Criteri di completamento**

- non applicabili finché manca una nuova decisione approvata.

## BAK-42 — Import staging e recovery

**Stato:** bloccato da DEC-08

**Priorità:** P0 se la feature verrà riaperta

**Obiettivo**

Progettare eventualmente validazione, staging e recovery senza mettere a rischio il database attivo.

**Situazione attuale**

L'import storico può rinominare tabelle e rimuovere database prima di avere completato una validazione/caricamento
affidabile; BAK-40 lo rende non eseguibile.

**Motivazione**

Un import futuro non potrà essere riabilitato senza un nuovo disegno e failure injection completa.

**Prerequisiti**

- nuova decisione che sostituisce DEC-08;
- BAK-41 riscritto e completato;
- strategia di cutover adatta alla singola istanza e al MySQL self-hosted.

**File coinvolti**

- da ridefinire; nessun file autorizzato ora.

**Istruzioni operative**

1. Non implementare o riabilitare l'import.
2. Alla riapertura, progettare da zero preflight, staging separato, verifica, cutover, rollback e failure injection.

**Vincoli**

- nessuna modifica al database attivo finché il workstream futuro non è verificato end-to-end.

**Rischi**

- una semplice transazione EF non rende atomico il rename/swap di un intero database MySQL.

**Verifiche**

- nessuna finché lo step è bloccato.

**Criteri di completamento**

- non applicabili finché manca una nuova decisione approvata.

## BAK-43 — Operatività e recovery drill

**Stato:** bloccato da DEC-08

**Priorità:** P1 se la feature verrà riaperta

**Obiettivo**

Definire eventualmente runbook, storage e prove di recovery della nuova feature.

**Situazione attuale**

Non esiste una feature supportata da esercitare; MySQL non è e non sarà incluso nel Compose applicativo.

**Motivazione**

Un recovery drill ha senso solo dopo avere definito lo scopo e implementato in sicurezza formato e import.

**Prerequisiti**

- nuova decisione che sostituisce DEC-08;
- BAK-41 e BAK-42 riscritti e completati.

**File coinvolti**

- da ridefinire; nessun file autorizzato ora.

**Istruzioni operative**

1. Non aggiungere container MySQL, volumi backup o job CLI al deployment corrente.
2. Alla riapertura, definire RPO/RTO, owner, storage, cifratura, retention e drill su infrastruttura self-hosted reale.

**Vincoli**

- Compose può contenere componenti applicativi, mai il MySQL di produzione.

**Rischi**

- confondere un export applicativo con un backup DB verificato crea una falsa garanzia di recovery.

**Verifiche**

- nessuna finché lo step è bloccato.

**Criteri di completamento**

- non applicabili finché manca una nuova decisione approvata.

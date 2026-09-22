# Fase 0 — baseline e rete di sicurezza

Obiettivo della fase: rendere ogni intervento successivo misurabile e impedire che test o strumenti colpiscano dati
non creati dal run corrente. Nessun refactoring architetturale appartiene a questa fase.

## BSL-00 — Baseline riproducibile

**Stato:** completato il 21 settembre 2026

**Priorità:** P0

**Obiettivo**

Salvare una baseline verificabile di build, dipendenze, contratto e test, separando chiaramente esiti reali da verifiche
non eseguite.

**Situazione attuale**

- `backend/backend.sln` contiene cinque progetti.
- Una rebuild passa con 0 errori e 79 warning; una build incrementale può mostrare 0 warning.
- I test non sono stati avviati perché `backend/logic/DatabaseFactory.cs:19-25` imposta un MySQL fisso e
  `backend/TestProject/Base/DatabaseBase.cs:20-27` lo elimina.
- Non esistono `global.json`, lock NuGet, CI o OpenAPI persistita.

**Motivazione**

Senza baseline, un warning sparito per build incrementale o un test non eseguito può essere scambiato per miglioramento.

**Prerequisiti**

Nessuno.

**File coinvolti**

- `backend/backend.sln`
- tutti i `backend/**/*.csproj`
- `backend/TestProject/**`
- `backend/webserver/Program.cs`
- `docs/API.md`
- `docs/backend-modernization/**`
- nuovi script/documenti di baseline solo se necessari; non includere segreti.

**Istruzioni operative**

1. Controllare working tree e SDK (`dotnet --info`) senza leggere `settings.json`.
2. Eseguire restore/audit in un ambiente con `NuGet.Config` accessibile; salvare versioni top-level e transitive.
3. Eseguire `dotnet build backend/backend.sln --no-restore -t:Rebuild` e classificare i 79 warning per progetto/codice.
4. Inventariare test trovati, inconcludenti, categorie e dipendenze esterne; non eseguirli ancora.
5. Generare una rappresentazione OpenAPI del comportamento corrente o, se l'host non è avviabile senza DB, registrare
   il blocco per TST-02.
6. Registrare versione MySQL effettivamente supportata/usata; se non nota, aprire un punto decisionale, non assumerla.
7. Allegare comandi/esiti al formato di `ROADMAP.md` e aggiornare solo numeri verificati.

**Vincoli**

- nessuna modifica funzionale;
- nessun accesso a database non creato appositamente;
- nessun secret in log o documento;
- la baseline deve usare rebuild, non solo build incrementale.

**Rischi**

- restore/audit dipendono da rete e configurazione NuGet;
- generare OpenAPI può tentare startup DB;
- output troppo verboso può includere path locali: normalizzarli senza nascondere errori.

**Verifiche**

- build da zero con conteggio warning;
- `dotnet list ... package --include-transitive` e `--vulnerable` completati oppure limite esplicito;
- conteggio test ripetibile (`61` alla baseline corrente);
- diff contiene solo artefatti di baseline/documentazione previsti.

**Criteri di completamento**

- SDK, runtime, package graph, build, warning e test inventory sono registrati con data;
- ogni verifica non eseguita ha motivo e owner;
- nessun DB è stato creato, modificato o eliminato;
- gli step successivi possono confrontarsi con una baseline univoca.

**Evidenza**

- [Baseline del 21 settembre 2026](../evidence/BSL-00_2026-09-21.md)

## DEC-00 — Chiusura delle decisioni bloccanti

**Stato:** completato il 20 settembre 2026

**Priorità:** P0

**Obiettivo**

Trasformare le decisioni di `DECISIONS_REQUIRED.md` in vincoli operativi approvati.

**Situazione attuale**

Il proprietario ha approvato DEC-01..10: ownership singola, Identity/cookie, nuova `/api/v1`, EUR decimal, saldi
negativi, data civile, singola istanza con MySQL esterno, CLI bloccata, eccezione sulle anomalie e registrazione pubblica
con verifica email.

**Motivazione**

Implementare questi punti per supposizione può correggere un bug introducendo una scelta di prodotto non desiderata.

**Prerequisiti**

- audit e baseline documentale esistenti; il completamento di DEC-00 non dichiara completato BSL-00.

**File coinvolti**

- `docs/backend-modernization/DECISIONS_REQUIRED.md`
- `docs/backend-modernization/ROADMAP.md`
- eventuali documenti di requisito forniti dal proprietario.

**Istruzioni operative**

1. Decisioni presentate e risposte ricevute dal proprietario.
2. Opzione, data, motivazione e conseguenze registrate in `DECISIONS_REQUIRED.md`.
3. BAK-41..43 marcati `bloccato` perché DEC-08 sospende la feature.
4. Contratto API, roadmap e schede aggiornati con i valori approvati.
5. Coerenza e link verificati prima della chiusura del task documentale.

**Vincoli**

- solo Markdown;
- nessuna decisione tecnica sostituisce l'approvazione su comportamento di prodotto/dati;
- non estendere scope con feature come sharing, MFA o multivaluta se non scelte.

**Rischi**

- scelte vaghe (“più avanti”) lasciano vulnerabilità aperte;
- una decisione può richiedere ripianificazione, soprattutto sharing o BFF.

**Verifiche**

- ricerca di tutte le occorrenze `DEC-` nei documenti;
- controllo che ogni riferimento punti a una decisione con stato;
- `git diff --check`.

**Criteri di completamento**

- tutte le decisioni necessarie al prossimo step hanno valore approvato;
- step dipendenti e contratti sono coerenti;
- decisioni non necessarie subito possono restare aperte soltanto con step dipendenti bloccati.

## TST-01 — MySQL di test effimero e guardie distruttive

**Stato:** completato il 21 settembre 2026

**Priorità:** P0

**Obiettivo**

Fare in modo che `dotnet test` usi esclusivamente un MySQL creato per il singolo run e non possa cancellare database
condivisi o configurati per errore.

**Situazione attuale**

- `DatabaseFactory.InTest()` imposta host `localhost`, porta `1883`, database `ut_money_gestor` e credenziali nel codice.
- `DatabaseBase` chiama `EnsureDeletedAsync` sull'intero DB.
- fixture diverse condividono stato statico e cancellano tabelle nel teardown.

**Motivazione**

È un rischio P0 e impedisce di eseguire in sicurezza la suite necessaria a ogni fix.

**Prerequisiti**

- BSL-00.

**File coinvolti**

- `backend/TestProject/TestProject.csproj`
- `backend/TestProject/Base/DatabaseBase.cs`
- `backend/TestProject/Base/ExecutorBase.cs`
- `backend/TestProject/Base/UserBase.cs`
- test con `ExecuteDeleteAsync`
- `backend/logic/DatabaseFactory.cs` solo per rimuovere il ramo test hard-coded, senza cambiare comportamento produzione
- nuovi fixture/helper test e configurazione container dedicata.

**Istruzioni operative**

1. Creare un fixture assembly-wide che avvia un container MySQL dedicato tramite Testcontainers (o infrastruttura CI
   equivalente già approvata), con credenziali casuali e database avente prefisso fisso più suffisso casuale.
2. Passare la connection string al test host via DI/configurazione, non tramite static globali produzione.
3. Prima di ogni `DROP/EnsureDeleted`, verificare contemporaneamente: modalità test esplicita, ID run, prefisso DB,
   host/container ID atteso e ownership del fixture. Se una guardia fallisce, abortire senza tentare cleanup.
4. Eliminare le credenziali hard-coded e il ramo `DatabaseFactory.InTest` quando nessun test lo usa.
5. Serializzare temporaneamente i test DB se condividono un database; preferire schema/database per run. Non abilitare
   parallelismo finché l'isolamento fixture non è provato.
6. Garantire cleanup in `OneTimeTearDown`/`finally`; se il teardown fallisce, riportare il resource ID senza includere
   password.
7. Documentare prerequisito Docker e un percorso CI; nessun fallback automatico verso `localhost`.

**Vincoli**

- i test devono usare MySQL reale, non EF InMemory;
- nessun nome DB generico o di produzione;
- `dotnet test` senza Docker/config test deve fallire in modo sicuro prima di connettersi;
- non cambiare ancora asserzioni di dominio.

**Rischi**

- startup container rallenta la suite;
- cleanup incompleto lascia container, non dati condivisi;
- stato statico può far collidere fixture finché ARC-20 non è completato.

**Verifiche**

- eseguire suite due volte consecutive;
- simulare host/nome non consentito e verificare rifiuto prima del drop;
- interrompere un run e verificare cleanup/reaper;
- confermare che ogni run usa ID/database diverso;
- `dotnet build` e `dotnet test` con esiti separati.

**Criteri di completamento**

- nessuna credenziale/porta/nome test hard-coded nel codice produzione;
- un run non può eliminare un DB non creato dal proprio fixture;
- suite avviabile con un solo comando documentato e fallimento sicuro senza prerequisiti;
- log test non contengono connection string o password.

**Evidenza**

- [Completamento della Fase 0](../evidence/PHASE_0_2026-09-21.md)

## TST-02 — Riparazione test e caratterizzazione

**Stato:** completato il 21 settembre 2026

**Priorità:** P0

**Obiettivo**

Ottenere una rete di regressione affidabile per command e pipeline HTTP prima dei fix P0.

**Situazione attuale**

- 61 test command, nessun test HTTP/CLI.
- `CorrectInsert_NegativeValue` esegue il command sbagliato.
- `DeleteWhenTransactionNotEmpty_Throws` è inconcludente.
- alcune query di test confrontano ID di entità diverse.
- setup utente passa da `UserManager`, duplicato non usato dall'host.

**Motivazione**

Test verdi ma non pertinenti possono mascherare regressioni di saldo e autorizzazione.

**Prerequisiti**

- TST-01.

**File coinvolti**

- `backend/TestProject/Commands/**`
- `backend/TestProject/Base/**`
- `backend/TestProject/Samples/**`
- `backend/TestProject/Utils/**`
- `backend/logic/Managers/UserManager.cs`
- `backend/webserver/Program.cs`
- nuovi API test basati su `WebApplicationFactory` e MySQL del fixture.

**Istruzioni operative**

1. Correggere test che eseguono la variabile/command errato e query che correlano ID non omogenei.
2. Sostituire l'inconclusive wallet con un caso completo.
3. Portare il setup attraverso gli stessi command/use case produttivi; rimuovere `UserManager` solo dopo ricerca consumer.
4. Aggiungere matrice cross-user per wallet, colore, tipo e movimenti che inizialmente documenti il comportamento
   corrente insicuro come test esplicitamente failing/ignored collegato allo step SEC, oppure inserirli direttamente
   nello step SEC corrispondente. Non rendere verde un exploit come comportamento desiderato.
5. Rendere l'host testabile con `WebApplicationFactory`, configurazione test e DB effimero.
6. Aggiungere characterization test per envelope, casing, status correnti, login, CORS e payload principali.
7. Separare categorie `Unit`, `Integration`, `Api`; evitare dipendenze fra ordine dei test.
8. Raccogliere coverage solo come misura, senza introdurre una soglia arbitraria in questo step.

**Vincoli**

- non correggere ancora codice applicativo P0 dentro questo step;
- non cambiare un'asserzione solo perché il codice corrente fallisce: classificare bug test vs bug prodotto;
- nessun test dipende da ordine, ID auto-incrementali coincidenti o clock reale.

**Rischi**

- characterization test possono cristallizzare bug; etichettarli e limitarli al contratto da preservare;
- test HTTP richiedono separare startup DB, lavoro poi completato in ARC-20.

**Verifiche**

- tutti i test non marcati come bug noto passano tre volte;
- 0 `Assert.Inconclusive` nei test eseguibili ordinari;
- ordine casuale o run per fixture non cambia esito;
- report elenca test per categoria e casi cross-user.

**Criteri di completamento**

- i 61 casi esistenti sono corretti, sostituiti o rimossi con motivazione;
- esistono test HTTP minimi e matrice autorizzazione pronta per fase 1;
- nessun setup usa codice legacy differente dal percorso produzione senza motivo documentato;
- baseline test ed eventuali bug noti sono registrati separatamente.

**Evidenza**

- [Completamento della Fase 0](../evidence/PHASE_0_2026-09-21.md)

## DEP-10 — Rimozione della dipendenza vulnerabile inutilizzata

**Stato:** completato il 21 settembre 2026

**Priorità:** P1

**Obiettivo**

Rimuovere Playwright dal progetto test backend e verificare che `System.Text.Json 6.0.5` non resti nel grafo.

**Situazione attuale**

`backend/TestProject/TestProject.csproj` dichiara `Microsoft.Playwright.NUnit 1.27.1` e un global using, ma `rg` non
trova consumer. Il grafo risolto include `System.Text.Json 6.0.5`, vulnerabilità High confermata da NuGet.

**Motivazione**

Aggiornare un framework browser non usato aggiunge costo; rimuoverlo chiude la causa minima.

**Prerequisiti**

- BSL-00. Può precedere TST-01 se la ricerca consumer è conclusiva.

**File coinvolti**

- `backend/TestProject/TestProject.csproj`
- eventuali lock/central package files introdotti da BSL-00.

**Istruzioni operative**

1. Cercare `Playwright`, tipi base e global using in tutto il repository.
2. Rimuovere package reference e using globale se zero consumer.
3. Restore da fonte approvata e rigenerare assets/lock.
4. Eseguire build/rebuild e suite sicura se TST-01 è già completo.
5. Eseguire audit top-level/transitivo e registrare ogni vulnerabilità residua separatamente.

**Vincoli**

- non spostare Playwright nel frontend in questo step;
- non aggiornare in massa altre dipendenze;
- nessuna soppressione dell'advisory come sostituto della rimozione.

**Rischi**

- consumer impliciti tramite base class/global using; la ricerca e compilazione li rilevano;
- audit dipende da rete/config NuGet.

**Verifiche**

- `rg -n Playwright .` senza consumer backend;
- `dotnet build ... -t:Rebuild`;
- asset/`dotnet list package --include-transitive` senza `System.Text.Json/6.0.5` proveniente da Playwright;
- audit vulnerabilità completato.

**Criteri di completamento**

- package e using rimossi;
- build/test invariati;
- advisory non presente nel grafo backend oppure dipendenza residua identificata con nuovo step;
- nessuna dipendenza non correlata aggiornata.

**Evidenza**

- [Completamento della Fase 0](../evidence/PHASE_0_2026-09-21.md)

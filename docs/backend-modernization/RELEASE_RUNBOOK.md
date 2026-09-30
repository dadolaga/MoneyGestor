# Release manuale e migrazioni

Procedura per il deployment a istanza singola con Docker Compose. Non pubblica immagini, non esegue deploy automatici e non avvia MySQL: il database è esterno. Le pipeline CI remote sono rinviate; fino alla loro introduzione ogni verifica qui indicata resta un gate manuale dell’operatore.

## Prerequisiti

- Partire da un commit Git pulito e registrare il commit completo usato per il rilascio.
- Verificare restore locked, build Release, suite backend e audit NuGet come indicato nel README principale.
- Per una modifica schema, leggere entrambe le migration SQL, verificare il preflight e provare il backup su uno schema `mg_restore_*` o in staging isolato. Le procedure sono in [DATABASE_DEPLOYMENT.md](DATABASE_DEPLOYMENT.md) e [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md).
- Operare da host protetto con `settings.json` non versionato e credenziali MySQL via login-path per backup/restore. Non copiare settings o credenziali in artifact e ticket.
- Conservare il volume Docker `backend-data-protection`: contiene le chiavi di protezione cookie e token e non è incluso nel backup MySQL. Proteggerlo e copiarlo con un backup separato cifrato prima di operazioni che possano ricreare i volumi.

## Preparare un rilascio

1. Scegliere un tag univoco derivato dal commit, per esempio `moneygestor/backend:2026-09-30-a1b2c3d4`. Non riutilizzare `local` in un rilascio.
2. Per una migration, eseguire prima il backup consistente e verificarne manifest/hash. Ripristinarlo su staging e provare la versione nuova con la stessa migration e impostazioni equivalenti; non usare il database live per il drill.
3. Creare la cartella di output e revisionare lo script SQL per entrambi i context quando ci sono migration:
   Se il tool EF richiede la connection string di design-time, valorizzare `MONEYGESTOR_DESIGN_CONNECTION_STRING` nel terminale protetto descritto in DATABASE_DEPLOYMENT.md; non stamparla.

   ```powershell
   New-Item -ItemType Directory -Force .\artifacts | Out-Null
   ```


   ```powershell
   dotnet tool restore
   dotnet tool run dotnet-ef migrations script --idempotent --project backend/database/database.csproj --context MoneyGestorContext --output .\artifacts\moneygestor.sql
   dotnet tool run dotnet-ef migrations script --idempotent --project backend/database/database.csproj --context IdentityAccountContext --output .\artifacts\identity.sql
   ```

   Gli script e l’eventuale SBOM sono file di rilascio: non includere settings, dump o dati reali.
4. In root, compilare l’immagine fissando il tag al commit. I riferimenti a base image sono multi-platform digest immutabili; aggiornali solo dopo aver verificato la release Microsoft e aver ricostruito/testato l’immagine:
   Per aggiornamenti futuri, controllare i manifest con `docker buildx imagetools inspect` per le immagini SDK e ASP.NET; poi aggiornare i digest, ricostruire il container e ripetere lo smoke test hardened e lo scan immagine autenticato.

   ```powershell
   $env:BACKEND_IMAGE = 'moneygestor/backend:2026-09-30-a1b2c3d4'
   docker compose build backend
   docker image inspect $env:BACKEND_IMAGE --format '{{.Id}} {{json .RepoDigests}}'
   docker scout cves $env:BACKEND_IMAGE
   ```

   Conservare il tag precedente localmente per il rollback. Se l’immagine si sposta tra host, salvarla e trasferirla attraverso il canale approvato; non committare bundle o credenziali.

## Cutover single-instance

1. Programmare la maintenance e fermare il frontend e il backend: `docker compose stop frontend backend`.
2. Creare e verificare un backup MySQL dopo aver fermato le scritture. Conservare l’originale invariato per recovery.
3. Per una migration applicativa, configurare temporaneamente `database.bootstrapMode` a `Migrate` in `settings.json`. Per una nuova installazione legacy che richiede adozione baseline, seguire invece il runbook DB-21: `MigrateAndAdoptLegacy` non è un’impostazione da release ricorrente.
4. Avviare soltanto il backend con l’immagine nuova e senza build: `docker compose up -d --no-build backend`. Una sola istanza avvia bootstrap/migration prima di servire; attendere lo stato healthy con `docker compose ps` e controllare outcome bootstrap/readiness nei log, senza riversare settings nei log.
5. Riportare `database.bootstrapMode` a `Disabled`, ricreare il container backend (`docker compose up -d --no-build --force-recreate backend`) e attendere nuovamente healthy. Avviare il frontend soltanto dopo: `docker compose up -d --no-build frontend`.
6. Fare smoke check su `/health/ready`, login di prova, lettura wallet/movimenti e riconciliazione read-only. Evitare mutazioni economiche ed email reali durante il check.
7. Registrare commit, tag e digest immagine, backup (nome non sensibile), migration outcome, health, smoke check, orari e operatore. Non registrare connection string o dati utente.

Il bind host dei servizi Compose è loopback per default. Pubblicare verso una rete solo dietro il reverse proxy previsto, impostando esplicitamente `BACKEND_BIND_ADDRESS`/`FRONTEND_BIND_ADDRESS` e configurando TLS e firewall sul proxy.

## Rollback

- Se il nuovo processo applicativo fallisce prima di completare bootstrap, mantenere il frontend fermo e i log per diagnosi. Non cancellare o ricreare il database sorgente.
- Se il problema è solo applicativo e lo schema è compatibile con la versione precedente, selezionare il tag precedente in `BACKEND_IMAGE`, avviare il backend con `bootstrapMode=Disabled`, attendere healthy e poi riaprire il frontend.
- Se il DDL è parziale, incompatibile o non reversibile, non eseguire `Down` alla cieca. Fermare i servizi, ripristinare il backup verificato su un nuovo database `mg_restore_*`, impostare `database.name` a quello staging e `bootstrapMode=Disabled`, avviare la versione applicativa compatibile e verificare lo staging. Mantenere intatto il database sorgente per analisi.
- Un rollback dell’applicazione non ripristina da sé i dati. Dopo la riapertura di scritture sul nuovo schema, tornare al database precedente richiede il recovery concordato e può perdere le scritture successive; trattarlo come un cutover separato.
- Conservare il volume delle chiavi Data Protection durante rollback. Non usare `docker compose down -v` durante un rilascio o recovery: eliminerebbe i volumi persistenti.

## Limiti attuali

La build/test/audit, l’approvazione migration, il deploy, il cutover e il rollback non sono ancora orchestrati da una CI remota. Il proprietario ha rinviato le GitHub Actions; non c’è un gate merge automatico finché non sarà scelta e configurata la pipeline. Il single-instance runbook resta manuale e richiede backup/restore staging prima delle migration a rischio.

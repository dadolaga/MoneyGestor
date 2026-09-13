# Istruzioni di collaborazione per MoneyGestor

## Autorizzazione corrente

Il proprietario autorizza l'assistente a intervenire sull'intero progetto per svolgere le attività richieste, senza dover ottenere ogni volta un'ulteriore autorizzazione preventiva per modificare il codice.

L'assistente può quindi:

- modificare, creare, spostare o rimuovere file sorgente, configurazioni e documentazione;
- aggiungere, aggiornare o rimuovere dipendenze;
- eseguire build, lint, type-check, test e altri strumenti di sviluppo pertinenti;
- effettuare refactoring, correggere problemi e implementare funzionalità nel backend, nel frontend e negli strumenti di supporto;
- modificare dati o risorse locali quando ciò è necessario per l'attività richiesta e l'impatto è stato verificato.

Questa autorizzazione è generale e permanente per il repository, salvo una successiva istruzione contraria del proprietario. Restano valide le cautele operative: preservare il lavoro non correlato già presente nel working tree, non esporre segreti e verificare con particolare attenzione le operazioni distruttive, i database e gli ambienti esterni.

## Contesto tecnico

- Backend: .NET 8, ASP.NET Core, EF Core/MySQL.
- Frontend: Next.js 15, React 19, TypeScript, MUI.
- Migrazione frontend pianificata: Tailwind CSS, shadcn/ui con primitive Radix e next-intl. TanStack è escluso. MUI resta presente temporaneamente e va rimosso per slice complete.
- Il database MySQL non è incluso in `docker-compose.yml`.
- Il backend legge `BACKEND_APP_SETTINGS` o `./settings.json`.
- La CLI legge `IMPORT_EXPORT_APP_SETTINGS` o `./settings.json`.
- Le API restituiscono un envelope `{ code, message, data }`.
- L'header `Authorization` contiene attualmente il token grezzo, senza prefisso `Bearer`.

## Prima di lavorare

1. Leggere `README.md`, `docs/ARCHITECTURE.md` e `docs/PROJECT_AUDIT.md`.
2. Controllare `git status --short` e preservare il lavoro non correlato.
3. Per modifiche frontend leggere anche `frontend/README_DEV.md`, `docs/FRONTEND_MIGRATION_PLAN.md`, `docs/UI_DESIGN_SYSTEM.md` e `docs/INTERNATIONALIZATION.md`.
4. Non leggere o mostrare il contenuto di `settings.json`; usare `settings.example.json` per lo schema.

## Verifica minima

- Modifiche solo documentali: controllare link relativi, coerenza fra documenti e `git diff --check`; non serve eseguire build.
- Modifiche frontend: `npm --prefix frontend run typecheck`, `npm --prefix frontend run lint` e `npm --prefix frontend run build`.
- Modifiche backend o condivise: `dotnet build backend/backend.sln`.
- Test backend: non avviarli senza aver verificato la destinazione MySQL. La suite crea e poi elimina `ut_money_gestor` su `localhost:1883`.

Segnalare separatamente errori introdotti dalla modifica, problemi preesistenti e verifiche non eseguite.

## Priorità tecniche

L'ordine generale dei rischi resta quello indicato in `docs/PROJECT_AUDIT.md`. Il workstream corrente è però la migrazione frontend descritta in `docs/FRONTEND_MIGRATION_PLAN.md`: non modificare backend, contratto API o logica di dominio finché il proprietario non apre esplicitamente quella fase.

## Coerenza frontend durante la migrazione

- Non introdurre nuovi componenti MUI nelle aree migrate.
- Migrare per slice verticali complete e mantenere il tema MUI legacy allineato ai token condivisi durante la convivenza.
- Non introdurre alcun pacchetto TanStack; il routing resta responsabilità di Next.js App Router.
- Non duplicare logica di feature fra desktop e mobile.
- Centralizzare token e varianti; le pagine non devono definire un proprio linguaggio visuale.
- Usare temi light/dark e un rosso di brand parametrico tramite token semantici.
- Usare Day.js come unica libreria data.
- Tenere login e registrazione fuori dalla shell dashboard.
- Dare priorità al Quick Add mobile da tre tocchi; il form completo resta disponibile per i casi avanzati.
- Non spostare logica di dominio nel frontend e non vincolare questa migrazione al backend, che verrà affrontato separatamente.
- L'accessibilità non è al momento un gate, ma non rimuovere semantica e comportamento base forniti da Radix.
- Usare `docs/dashboard_mockup.png` come riferimento visuale ufficiale per ogni pagina e componente.
- Nei testi rivolti all'utente usare “movimento”; mantenere `Transaction` nei nomi tecnici finché non viene richiesto un refactoring dedicato.
- Non implementare ricerca globale, notifiche, categorie, budget, obiettivi, report, export, stato movimenti o andamento storico solo perché compaiono nel mockup: sono possibilità future fuori scope.
- Preparare ogni nuova slice per next-intl: niente testi UI significativi hard-coded, chiavi semantiche per feature e formatter condivisi.
- Usare inglese come locale predefinita senza prefisso URL e italiano sotto `/it`; niente rilevamento automatico dal browser.
- La lingua attiva è determinata dall'URL; se un form è modificato, chiedere conferma prima di cambiare locale.
- Usare Day.js per parsing/calcoli delle date e next-intl/Intl per la loro presentazione localizzata.
- Usare esclusivamente il wrapper di navigazione locale-aware nelle feature multilingua.
- Non rimuovere una dipendenza legacy finché una ricerca sull'intero frontend non conferma che non ha più consumer.
- Aggiornare piano, sistema visuale e README quando una fase cambia stato.

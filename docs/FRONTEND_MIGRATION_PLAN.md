# Piano di migrazione frontend

Stato: stack, direzione visuale e perimetro approvati; dettaglio Quick Add ancora da validare.

Ultima ricognizione: 13 settembre 2026.

## Obiettivo

Migrare progressivamente il frontend da Material UI a un sistema basato su:

- Next.js App Router e React, che restano il framework applicativo;
- Tailwind CSS per layout, responsive e token visuali;
- shadcn/ui basato su Radix per primitive possedute dal repository;
- next-intl per traduzioni, routing locale-aware e formattazione;
- React e moduli frontend sottili per il solo stato di presentazione.

La migrazione deve procedere per piccole slice verificabili. MUI può convivere temporaneamente con il nuovo stack, ma una pagina dichiarata migrata non deve più importare MUI e tutte le pagine, vecchie e nuove, devono usare lo stesso linguaggio visuale.

La direzione visuale ufficiale è [dashboard_mockup.png](dashboard_mockup.png). Il mockup stabilisce stile, densità, gerarchia e tono del prodotto, ma non amplia il perimetro funzionale.

TanStack è stato escluso interamente dalla destinazione. Il routing resta affidato a Next.js App Router; query, tabelle e form non useranno pacchetti TanStack. La logica di dominio e le elaborazioni pesanti resteranno responsabilità del backend, che è fuori dallo scope di questa migrazione visuale.

## Fotografia del frontend attuale

Il frontend contiene 36 file TypeScript, JavaScript o CSS fuori da `node_modules` e `.next`. Ventiquattro file sotto `src` importano direttamente MUI, per un totale di 42 righe di import. Non sono presenti test frontend.

Dipendenze e responsabilità principali:

| Area | Implementazione attuale | Destinazione proposta |
|---|---|---|
| layout e responsive | MUI `Box`, `Grid`, `useMediaQuery` | Tailwind e CSS media/container query |
| componenti | MUI e componenti wrapper locali | shadcn/ui in `src/components/ui` |
| notifiche | notistack | Sonner tramite il componente shadcn |
| icone | Font Awesome | Lucide, salvo icone di brand |
| dati remoti | Axios e `ApiRequest` callback-based | invariato durante il restyling; integrazione backend rinviata |
| tabelle | MUI Table e contesti locali | shadcn Table + stato di presentazione React |
| form | `FormContext`, `Input`, `Submit` custom | React Hook Form come gestore leggero dello stato UI |
| date | Day.js + MUI X Date Pickers | Calendar/Popover shadcn; `Date` al boundary UI e Day.js per parsing/calcoli |
| grafici | Nivo Pie | Recharts tramite i componenti Chart di shadcn |
| routing | Next.js App Router | invariato |
| lingua e formati | testi italiani hard-coded | next-intl, dizionari versionati e formatter centrali |
| tema | `createTheme` MUI dark, valori sparsi | token CSS semantici condivisi |

Dipendenze dichiarate ma non usate nel sorgente: `chart.js`, `react-router-dom` e, allo stato attuale, `recharts`. Recharts è però il candidato naturale per i grafici shadcn e può diventare usato durante la migrazione.

## Flussi da preservare

La nuova UI deve mantenere questi comportamenti, correggendo separatamente i bug già noti:

1. registrazione e login con token grezzo nell'header `Authorization`;
2. controllo della sessione nell'header e rinvio al login in caso di scadenza;
3. dashboard filtrata per intervallo con totali e categorie;
4. elenco, creazione, modifica, preferito ed eliminazione wallet;
5. elenco movimenti con filtro, ordinamento server-side e paginazione;
6. creazione, modifica ed eliminazione di movimenti;
7. gestione speciale dei trasferimenti fra wallet e dei tipi globali;
8. layout desktop e mobile.

Le etichette dell'interfaccia useranno “movimento”. Route, DTO, classi e nomi tecnici esistenti possono continuare a usare `transaction`/`Transaction` finché un eventuale refactoring separato non sarà giustificato.

Sono fuori scope, anche se visibili nel mockup: ricerca globale, notifiche, categorie, budget, obiettivi, report, export, stato dei movimenti e grafico storico del saldo. Non vanno creati placeholder o dati fittizi per queste funzioni.

Il backend e il suo futuro contratto sono esplicitamente fuori dallo scope. Il restyling non deve incorporare regole di dominio nel frontend né essere progettato attorno alle particolarità dell'API corrente. Durante la migrazione, l'accesso dati esistente può restare dietro adapter sottili; verrà ripensato quando inizierà il lavoro sul backend.

## Principi di migrazione

### Una sola fonte visuale

Colori, font, spaziature, raggi, ombre, altezze dei controlli, breakpoint e stati interattivi devono essere definiti nel contratto visuale in [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md). Non sono ammessi colori di prodotto o misure strutturali hard-coded nelle pagine, salvo dati dinamici come il colore di un wallet.

Durante la convivenza, il tema MUI legacy dovrà riflettere gli stessi token CSS. In questo modo una route non ancora migrata non apparirà come un prodotto diverso.

### Slice verticali, non sostituzioni massive

Ogni slice comprende componenti, stato di presentazione, stati di loading/empty/error, responsive, test e documentazione. Una slice è conclusa soltanto quando non contiene più import MUI.

### Primitive possedute dal progetto

I file generati da shadcn/ui saranno codice del repository. Le modifiche vanno concentrate nelle primitive o nei pattern condivisi, non replicate nelle pagine. Gli aggiornamenti tramite CLI non devono usare `--overwrite` senza revisione del diff perché possono sovrascrivere personalizzazioni locali.

### Frontend leggero

Il frontend gestisce apertura dialog, filtri visuali, tab attivi, campi e feedback. Regole economiche, autorizzazione, aggregazioni, ordinamenti pesanti e validazione di dominio appartengono al backend. Non va introdotta una cache applicativa o uno state manager finché non emerge un bisogno concreto.

### Responsive per composizione

Desktop e mobile devono condividere campi, stato del form e componenti di feature. Possono avere presentazioni diverse, ma non due implementazioni complete e divergenti dello stesso flusso. La route sperimentale `transaction/add_mobile` va quindi assorbita in un unico flusso responsive.

## Architettura frontend di destinazione

Struttura proposta, da introdurre gradualmente:

```text
frontend/src/
|-- app/
|   `-- [locale]/
|       |-- (auth)/             # login/register, senza shell dashboard
|       |-- (legacy)/dashboard/ # route MUI non ancora migrate
|       `-- (app)/dashboard/    # route shadcn e nuova shell
|-- components/
|   |-- ui/                     # primitive shadcn, modifiche controllate
|   `-- shared/                 # shell, feedback, empty state, money/date UI
|-- features/
|   |-- auth/
|   |-- dashboard/
|   |-- transactions/
|   `-- wallets/
|-- lib/
|   |-- api/                    # adapter temporaneo, integrazione da rivedere col backend
|   |-- format/                 # valuta, percentuali e date
|   `-- fixtures/               # dati realistici per catalogo e sviluppo UI
|-- providers/                  # tema e notifiche
|-- i18n/                       # locale, navigation wrapper e caricamento messaggi
`-- types/                      # DTO frontend e tipi di dominio UI
```

I route group non modificano gli URL. Ogni slice viene spostata da `(legacy)` a `(app)` nello stesso cambiamento in cui elimina MUI; non possono esistere due pagine che risolvono allo stesso pathname. Le route devono restare sottili e il codice di feature non deve importare componenti interni di un'altra route.

## Strategia di coesistenza MUI/Tailwind

Tailwind Preflight e gli stili globali possono cambiare anche componenti MUI non migrati. La strategia scelta è tenere Preflight disabilitato durante la convivenza, importando i layer theme e utilities di Tailwind e definendo soltanto il minimo layer base necessario alle nuove primitive. Preflight verrà abilitato dopo l'ultima route MUI, con una verifica visuale completa.

Prima di migrare una pagina occorre quindi:

1. acquisire screenshot desktop e mobile delle route esistenti;
2. introdurre Tailwind e shadcn in un commit di sola infrastruttura;
3. verificare tutte le route legacy con Preflight disabilitato;
4. limitare il layer base alle nuove primitive e correggere eventuali collisioni nel tema MUI di compatibilità;
5. vietare l'uso contemporaneo di primitive MUI e shadcn dentro lo stesso componente nuovo.

Durante la prima fase il `ThemeProvider` MUI può restare nel layout dashboard esistente. Quando nasce la nuova shell, le route vengono separate con route group `(legacy)` e `(app)`: soltanto `(legacy)` riceve il provider MUI. Provider di tema, i18n e toaster vivono in moduli piccoli e separati, così non forzano tutta l'app a essere un Client Component.

## Piano per fasi

### Fase 0 — decisioni e baseline

Deliverable:

- risposte alle questioni aperte in fondo al documento;
- matrice delle route con viewport desktop e mobile;
- screenshot baseline e checklist funzionale per ogni flusso;
- scelta delle versioni esatte e lockfile riproducibile;
- backlog dei bug funzionali distinto dalla migrazione visuale;
- tema chiaro/scuro e direzione visuale approvati;
- prototipo del flusso rapido “movimento in tre tocchi”.

Il mockup desktop deve essere registrato come baseline ufficiale e il backlog funzionale deve restare limitato alle capacità già presenti nel progetto.

Criterio di uscita: direzione visuale approvata e nessuna decisione strutturale lasciata implicita.

### Fase 1 — fondamenta senza rimuovere MUI

Attività:

- installare Tailwind CSS v4 con PostCSS e inizializzare shadcn/ui nel progetto esistente;
- configurare shadcn/ui con primitive Radix, stile `new-york`, base neutra e CSS variables abilitate;
- creare `components.json`, `cn`, token CSS semantici in OKLCH e temi light/dark;
- disabilitare Preflight durante la convivenza MUI e documentare il layer base minimo;
- configurare next-intl, segmento `[locale]`, dizionari e navigation wrapper;
- mantenere gli URL inglesi senza prefisso, usare `/it/...` per l'italiano e disabilitare il rilevamento automatico;
- aggiungere le primitive iniziali: Button, Card, Input, Label, Checkbox, Dialog, AlertDialog, Select, DropdownMenu, Sheet, Skeleton, Progress, Table, Popover, Calendar, Badge, Avatar, Separator e Sonner;
- introdurre Lucide e la convenzione per dimensione/stroke delle icone;
- creare provider separati per tema (`next-themes`, default `system`) e toast;
- riallineare temporaneamente il tema MUI legacy ai token;
- rendere locale il font per eliminare il download Google in build;
- aggiungere una route interna leggera `/design-system`, disponibile solo in sviluppo, con varianti light/dark e inglese/italiano;
- introdurre Vitest, Testing Library, `user-event` e `jest-dom`; tenere Playwright per gli smoke test delle slice;

Non si rimuove alcuna dipendenza MUI in questa fase.

Criterio di uscita: build, lint e typecheck passano; le route MUI non hanno regressioni visuali evidenti; primitive e token sono documentati.

L'architettura i18n completa è descritta in [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).

### Fase 2 — confine UI e dati, senza ridisegnare il backend

Attività:

- separare componenti visuali e caricamento dati tramite props e adapter di feature;
- mantenere temporaneamente `useApi` dove serve a non rompere il progetto;
- non aggiungere cache, query framework o logica di dominio nel client;
- creare fixture realistiche per sviluppare `/design-system` e gli stati delle pagine senza backend;
- definire in ogni feature gli stati visuali `idle`, `loading`, `ready`, `empty` ed `error`;
- rimandare autenticazione, retry, contratto HTTP, filtri server e invalidazione alla futura fase backend;
- testare i componenti visuali usando fixture, senza dipendere da servizi esterni.

Questa fase consente di progettare il frontend come se il backend non esistesse, mantenendo però un punto di collegamento futuro ben delimitato.

Criterio di uscita: i componenti di feature possono essere mostrati con fixture; nessuna nuova regola di dominio viene introdotta nel frontend.

### Fase 3 — form e primitive condivise

Attività:

- usare React Hook Form soltanto per stato, errori e submit dei form;
- limitare la validazione client ai requisiti di interazione immediata; la validazione di dominio resterà nel backend;
- creare field wrapper condivisi per testo, password, importo, checkbox, select e data;
- normalizzare l'importo secondo la locale attiva nel payload di presentazione prima di consegnarlo all'adapter;
- creare un unico date range picker: il Calendar shadcn scambia `Date`, convertito a Day.js nel boundary di feature, senza import da moduli `internals`;
- sostituire `DeleteDialog` con AlertDialog e supportare correttamente messaggi dinamici;
- creare pattern condivisi per loading, empty state, error state e conferma distruttiva;
- rimuovere `FormContext`, `Input`, `Submit`, `DataPicker` e `DataPickerNew` solo quando non hanno più consumer.

Criterio di uscita: errori inline, submit pending e reset sono coperti da test; Day.js è l'unica libreria data.

### Fase 4 — shell applicativa

Attività:

- migrare header, sidebar e drawer mobile a shadcn Navigation/DropdownMenu/Sheet;
- evidenziare la route attiva;
- predisporre login, logout, avatar e feedback sessione senza definirne ancora il contratto backend;
- eliminare `useIsMobile` basato su MUI; preferire CSS responsive e usare JavaScript solo quando cambia il comportamento, non soltanto il layout;
- applicare dimensioni e spaziatura della shell definite dal design system;
- verificare almeno focus trap, Escape e tab order offerti dalle primitive Radix, senza rendere l'accessibilità un blocco di progetto in questa fase.

Criterio di uscita: shell unica e coerente su tutte le route, anche quelle ancora MUI.

### Fase 5 — autenticazione

Slice di destinazione:

- `/login` e `/it/login`;
- `/register` e `/it/register`.

Attività specifiche:

- collocare login e registrazione fuori dalla shell dashboard;
- trasformare `/dashboard/user/login` e `/dashboard/user/new` in redirect temporanei che preservano la locale;
- preparare i campi e gli stati visuali senza fissare il futuro contratto di sessione;
- aggiungere autocomplete, label, error summary e stato pending;
- usare `next/image` per il logo e dimensioni responsive;
- mantenere il ritorno alla dashboard come destinazione visuale prevista dopo l'accesso.

Criterio di uscita: entrambe le pagine senza import MUI, test dei casi successo/errore e aspetto coerente con la shell.

### Fase 6 — wallet

Slice:

- `/dashboard/wallet`;
- dialog create/edit;
- elenco/tabella;
- grafico distribuzione.

Attività specifiche:

- mantenere la vista wallet indipendente dal meccanismo futuro di caricamento;
- usare la tabella shadcn con stato React solo per interazioni leggere; ordinamento e paginazione reali saranno collegati al backend in seguito;
- sostituire azioni inline con pulsanti accessibili o menu azioni;
- mostrare correttamente colore, preferito, saldo e totale;
- sostituire Nivo con il Chart shadcn/Recharts;
- definire una presentazione mobile a card/lista se la tabella non è leggibile;
- gestire empty state, skeleton ed error state con fixture dedicate.

Criterio di uscita: feature wallet senza MUI/Nivo/notistack/Font Awesome; stati, azioni UI e adapter verificati con fixture.

### Fase 7 — movimenti (`transaction` nel codice)

È la slice più rischiosa e va affrontata dopo i pattern condivisi.

Attività specifiche:

- creare un solo modello di form e un solo adapter di submit per add/edit;
- creare un flusso “Quick Add” ottimizzato per completare un movimento ordinario in tre tocchi, esclusa la digitazione dell'importo;
- precompilare data corrente, wallet preferito e ultimo tipo/preset usato, con possibilità di correzione;
- mantenere trasferimento e modifica completa in un percorso avanzato distinto dal Quick Add;
- condividere lo stesso form state tra presentazione desktop e mobile;
- usare la tabella shadcn e semplici controlli React; collegamento di filtri, sort e paginazione al backend rinviato;
- sostituire la route mobile duplicata con una composizione responsive condivisa;
- aggiungere test di trasferimento, segno, filtro, sort, pagina, edit e delete.

Criterio di uscita: feature movimenti senza MUI; desktop e mobile condividono componenti e stato; il prototipo Quick Add rispetta il budget di tre tocchi.

### Fase 8 — dashboard e grafici

Attività:

- migrare KPI, intervallo date, empty state e azione di inserimento;
- sostituire entrambi i pie Nivo con Chart shadcn/Recharts;
- gestire `incoming = 0` nel saving rate;
- definire palette categorie accessibile e tooltip coerenti;
- rendere i grafici leggibili anche senza colore e su schermi piccoli.

Criterio di uscita: dashboard senza MUI/Nivo e test dei calcoli/empty state.

### Fase 9 — route secondarie e consolidamento

Attività:

- riallineare `/dashboard/not_implemented` al design system senza trasformarlo in una nuova funzionalità;
- riallineare `/dashboard/error`, oggi ancora basata su MUI, al design system;
- rimuovere codice morto, inclusi il vecchio date picker e wrapper non più usati;
- rimuovere MUI, MUI X, Emotion, notistack, Nivo e Font Awesome quando `rg` conferma zero import;
- rimuovere dipendenze dichiarate e non usate;
- eliminare il tema di compatibilità;
- aggiornare README, architettura, audit e AGENTS allo stato effettivo;
- verificare bundle e dipendenze duplicate.

Criterio di uscita: nessun import legacy, nessuna pagina fuori standard e lockfile pulito.

## Ordine consigliato dei pull request

Ogni voce deve essere un cambiamento piccolo e reversibile:

1. piano di migrazione e design system approvati;
2. Tailwind/shadcn, token e next-intl, senza migrare feature;
3. route locale-aware, dizionari base e selettore lingua;
4. fixture e confine fra componenti visuali e dati;
5. test harness frontend;
6. primitive form e feedback;
7. shell;
8. login;
9. registrazione;
10. wallet dialog;
11. wallet list/table;
12. wallet chart;
13. transaction filters e table adapter;
14. transaction add/edit condiviso;
15. transaction responsive/mobile;
16. dashboard KPI/date;
17. dashboard chart;
18. route secondarie;
19. rimozione completa dello stack legacy.

## Matrice file attuali

| File/area | Dipendenze o problema | Fase |
|---|---|---:|
| `app/dashboard/layout.tsx` | ThemeProvider MUI, Snackbar, shell client | 1, 2, 4 |
| `header.tsx`, `drawer.tsx` | MUI, Font Awesome, sessione | 4 |
| `hooks/useApi.ts` | Axios, cookie, callback API, redirect | 2 |
| `context/FormContext.tsx` | form custom non tipizzato per schema | 3 |
| `context/SortTableContext.tsx` | sort custom accoppiato alla tabella MUI | 7 |
| `component/Input.tsx` | accoppia form, MUI, date e route mobile | 3 |
| `DataPicker*.tsx` | duplicazione e API MUI interna | 3 |
| auth | form, MUI, cookie e navigazione | 5 |
| wallet | MUI, refresh via ref, sort non applicato, Nivo | 6 |
| transactions | MUI, form duplicato, filtri incompleti | 7 |
| dashboard | MUI, Nivo, divisione per zero | 8 |
| `app/dashboard/error/page.tsx` | pagina errore legacy basata su MUI | 9 |

## Test e controlli per ogni slice

Controlli automatici minimi:

- TypeScript strict;
- ESLint e Prettier;
- test unitari di converter, normalizzatori e formatter;
- test componenti con Testing Library;
- fixture e adapter mock per gli stati delle feature;
- smoke test Playwright per login, wallet, movimenti e dashboard;
- build Next.js senza download di rete;
- ricerca degli import legacy nell'area migrata.

Controlli visuali minimi:

- 360×800 e 390×844 mobile;
- 768×1024 tablet;
- 1440×900 desktop;
- temi light e dark;
- loading, empty, error, dati lunghi e importi negativi.

Controlli non bloccanti ma da preservare quando gratuiti: semantica HTML, focus e comportamento tastiera di Radix, contrasto leggibile e assenza di rotture evidenti a zoom 200%. Un audit accessibilità dedicato è fuori scope in questa fase.

## Definition of Done globale

La migrazione è conclusa quando:

- `rg "@mui|@emotion|@nivo|notistack|@fortawesome" frontend/src` non trova import;
- tutte le route usano token e primitive condivise;
- non esistono due implementazioni della stessa logica desktop/mobile;
- componenti e stato di presentazione sono centralizzati per feature;
- il frontend non contiene logica economica o di autorizzazione destinata al backend;
- typecheck, lint, format check, test e build passano;
- i README, l'architettura, l'audit e AGENTS descrivono lo stato reale;
- gli screenshot approvati non mostrano deviazioni non intenzionali fra pagine.

## Rischi principali e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Tailwind Preflight altera MUI | Preflight disabilitato durante la convivenza; attivazione e baseline completa dopo l'ultima route MUI |
| pagine ibride incoerenti | token condivisi e migrazione per route completa |
| stato duplicato durante la transizione | adapter temporaneo e una sola fonte di stato per feature |
| regressioni in trasferimenti/importi | modello di form unico, normalizzatori e test prima della UI |
| bundle più grande durante la convivenza | finestra di coesistenza limitata e misurata |
| componenti shadcn divergenti | modifiche solo nelle primitive e catalogo UI |
| update CLI sovrascrive personalizzazioni | mai usare overwrite senza diff e test |
| backend futuro diverso da quello attuale | componenti guidati da props e adapter sostituibili |

## Decisioni confermate

- TanStack escluso completamente.
- Primitive shadcn basate su Radix.
- Tailwind CSS v4 e shadcn stile `new-york`, con CSS variables semantiche in OKLCH.
- Preflight disabilitato durante la convivenza con MUI e attivato soltanto nel consolidamento finale.
- Rosso mantenuto come accento, ma espresso unicamente tramite token facilmente parametrizzabili.
- Tema chiaro e scuro supportati.
- Tema iniziale uguale alla preferenza di sistema, con scelta manuale persistita tramite `next-themes`.
- Linguaggio visivo a metà fra prodotto finanziario professionale e fintech moderno.
- Inserimento rapido mobile come priorità, con obiettivo di tre tocchi.
- Login e registrazione fuori dalla shell dashboard.
- Day.js come unica libreria per le date.
- React Hook Form per il solo stato di presentazione dei form.
- Vitest e Testing Library per unit/component test; Playwright per gli smoke test.
- Catalogo UI leggero interno, senza Storybook nella prima fase.
- Accessibilità non è per ora un criterio bloccante; si mantengono comunque le garanzie di base offerte da Radix e HTML semantico.
- Backend, contratto API e logica di dominio rinviati a una fase successiva separata.
- `dashboard_mockup.png` è la fonte visuale ufficiale per l'intero frontend.
- Nei testi rivolti all'utente si usa “movimento”; `Transaction` rimane il termine tecnico interno.
- Le funzionalità future visibili nel mockup sono escluse e non vanno implementate durante la migrazione.
- L'internazionalizzazione viene introdotta nelle fondamenta seguendo [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).
- Inglese predefinito senza prefisso, italiano sotto `/it`, lingua determinata dall'URL senza rilevamento browser.
- Login e registrazione di destinazione sono `/login` e `/register`, con equivalenti `/it/...` e redirect legacy temporanei.

## Questione ancora aperta

Prima di implementare il Quick Add bisogna definire quali valori possono essere precompilati e cosa conta esattamente come “click”. Il riferimento mobile sarà derivato dallo stile ufficiale del mockup desktop.

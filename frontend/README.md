# Frontend MoneyGestor

Client web di MoneyGestor realizzato con Next.js 15, React 19 e TypeScript. Le route legacy usano ancora Material UI; le
fondamenta e i componenti nuovi usano Tailwind CSS, shadcn/ui su Radix e next-intl.

Il frontend è in migrazione progressiva a Tailwind CSS e shadcn/ui con primitive Radix. Le Fasi 1–6 sono implementate:
fondamenta, shell, autenticazione e wallet usano già il nuovo stack. TanStack è stato escluso; MUI resta soltanto nelle
slice legacy non ancora migrate. Il riferimento ufficiale è il [mockup della dashboard](../docs/dashboard_mockup.png),
da cui derivano temi light/dark, rosso parametrico e Quick Add mobile da tre tocchi. Consulta anche il
[piano di migrazione](../docs/FRONTEND_MIGRATION_PLAN.md) e il [sistema visuale condiviso](../docs/UI_DESIGN_SYSTEM.md).

Nell'interfaccia si usa il termine “movimento”; `Transaction` resta il nome tecnico interno. Le funzionalità future
raffigurate nel mockup non fanno parte dello scope corrente.

L'architettura multilingua usa next-intl, inglese predefinito, italiano opzionale, dizionari locali e formattazione
centralizzata. Consulta il [piano di internazionalizzazione](../docs/INTERNATIONALIZATION.md).

## Avvio

Dalla radice del repository:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm --prefix .\frontend install
npm --prefix .\frontend run dev
```

Oppure dalla directory `frontend`:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm install
npm run dev
```

Apri `http://localhost:3000`. Se `NEXT_PUBLIC_API_URL` non è valorizzata, il client usa attualmente
`https://localhost:7184`; per uno sviluppo riproducibile conviene impostare sempre la variabile.

## Script

| Comando                | Scopo                                                    |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | server di sviluppo                                       |
| `npm run build`        | build di produzione                                      |
| `npm run start`        | avvio della build di produzione                          |
| `npm run lint`         | controlli ESLint                                         |
| `npm run lint:fix`     | correzioni ESLint automatiche                            |
| `npm run test`         | test unitari e dei componenti con Vitest/Testing Library |
| `npm run typecheck`    | controllo TypeScript senza emissione                     |
| `npm run format`       | formattazione Prettier                                   |
| `npm run format:check` | verifica Prettier                                        |

## Route principali

| Route                                          | Funzione                                                     |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `/dashboard`                                   | riepilogo entrate, uscite e categorie da `/api/v1`           |
| `/dashboard/wallet`                            | gestione wallet da `/api/v1`, con preferiti e saldi          |
| `/dashboard/transaction`                       | CRUD movimenti con filtri tipizzati e paginazione server-side|
| `/dashboard/transaction/add_mobile`            | prototipo mobile da assorbire nel futuro Quick Add condiviso |
| `/login`, `/register`                          | autenticazione fuori dalla shell dashboard                   |
| `/dashboard/user/login`, `/dashboard/user/new` | redirect temporanei alle route di autenticazione             |
| `/dashboard/error`                             | errore legacy da riallineare al design system                |
| `/dashboard/not_implemented`                   | segnaposto per funzionalità future                           |

Login e registrazione sono fuori dalla shell dashboard; le vecchie route restano redirect temporanei. L'italiano
aggiunge il prefisso `/it` alle stesse route. Le pagine account, wallet, movimenti e dashboard usano `/api/v1` con
cookie Identity e antiforgery; le fixture restano disponibili per preview e test dei componenti.

## Organizzazione

- `src/app`: route e componenti specifici delle pagine
- `src/components/shared`: componenti comuni del nuovo sistema, inclusi form, stati e conferme
- `src/component` e `src/context`: componenti legacy MUI, mantenuti finché hanno consumer
- `src/hooks/useApi.ts`: adapter callback degli endpoint account `/api/v1` mantenuti dalle form legacy
- `src/lib/api/client.ts`: client Promise con cookie, antiforgery, errori tipizzati e cancellation per le risorse v1
- `src/features`: view model, adapter puri e componenti visuali pilotati tramite props
- `src/lib/fixtures`: dati realistici per sviluppo e test senza backend
- `src/types/feature-state.ts`: stati condivisi `idle`, `loading`, `ready`, `empty` ed `error`
- `src/models/backend.ts`: tipi del contratto API
- `src/utilis`: conversioni per filtri, colori e valori monetari

Le pagine migrate non leggono token di autenticazione; usano il cookie Identity HttpOnly e inviano l'header antiforgery
prima delle mutazioni. Il client legacy server-side resta isolato finché non termina la finestra di compatibilità.

Per le convenzioni interne consulta [README_DEV.md](README_DEV.md). Per problemi noti e priorità consulta
[l'audit](../docs/PROJECT_AUDIT.md).

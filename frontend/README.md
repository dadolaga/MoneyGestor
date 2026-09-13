# Frontend MoneyGestor

Client web di MoneyGestor realizzato con Next.js 15, React 19, TypeScript e Material UI.

Il frontend è in fase di pianificazione per una migrazione progressiva a Tailwind CSS e shadcn/ui con primitive Radix. TanStack è stato escluso. MUI resta lo stack effettivo finché le singole slice non vengono migrate e verificate. Il riferimento ufficiale è il [mockup della dashboard](../docs/dashboard_mockup.png), da cui derivano temi light/dark, rosso parametrico e Quick Add mobile da tre tocchi. Consulta anche il [piano di migrazione](../docs/FRONTEND_MIGRATION_PLAN.md) e il [sistema visuale condiviso](../docs/UI_DESIGN_SYSTEM.md).

Nell'interfaccia si usa il termine “movimento”; `Transaction` resta il nome tecnico interno. Le funzionalità future raffigurate nel mockup non fanno parte dello scope corrente.

L'architettura multilingua pianificata usa next-intl, inglese predefinito, italiano opzionale, dizionari locali e formattazione centralizzata. Consulta il [piano di internazionalizzazione](../docs/INTERNATIONALIZATION.md).

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

Apri `http://localhost:3000`. Se `NEXT_PUBLIC_API_URL` non è valorizzata, il client usa attualmente un indirizzo LAN codificato in `src/hooks/useApi.ts`; per uno sviluppo riproducibile conviene impostare sempre la variabile.

## Script

| Comando | Scopo |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione |
| `npm run start` | avvio della build di produzione |
| `npm run lint` | controlli ESLint |
| `npm run lint:fix` | correzioni ESLint automatiche |
| `npm run typecheck` | controllo TypeScript senza emissione |
| `npm run format` | formattazione Prettier |
| `npm run format:check` | verifica Prettier |

## Route principali

| Route | Funzione |
|---|---|
| `/dashboard` | riepilogo entrate, uscite e categorie |
| `/dashboard/wallet` | elenco e gestione portafogli |
| `/dashboard/transaction` | elenco, filtri e gestione movimenti |
| `/dashboard/transaction/add_mobile` | prototipo mobile da assorbire nel futuro Quick Add condiviso |
| `/dashboard/user/login` | accesso |
| `/dashboard/user/new` | registrazione |
| `/dashboard/error` | errore legacy da riallineare al design system |
| `/dashboard/not_implemented` | segnaposto per funzionalità future |

Nell'architettura di destinazione login e registrazione diventeranno rispettivamente `/login` e `/register`, fuori dalla shell dashboard; le vecchie route resteranno solo come redirect temporanei. L'italiano aggiunge il prefisso `/it` alle stesse route.

## Organizzazione

- `src/app`: route e componenti specifici delle pagine
- `src/component`: componenti condivisi
- `src/context`: stato e logica condivisa per form e ordinamento
- `src/hooks/useApi.ts`: client HTTP e adattamento dell'envelope backend
- `src/models/backend.ts`: tipi del contratto API
- `src/utilis`: conversioni per filtri, colori e valori monetari

Il token viene attualmente letto dal cookie `token` e inviato nel valore grezzo dell'header `Authorization`.

Per le convenzioni interne consulta [README_DEV.md](README_DEV.md). Per problemi noti e priorità consulta [l'audit](../docs/PROJECT_AUDIT.md).

# Convenzioni frontend

Questo file descrive le convenzioni già adottate o desiderate nel frontend. Non sostituisce ESLint e TypeScript.

## Migrazione UI pianificata

La migrazione a Tailwind CSS e shadcn/ui basato su Radix deve seguire il
[piano per slice](../docs/FRONTEND_MIGRATION_PLAN.md) e il [contratto visuale](../docs/UI_DESIGN_SYSTEM.md). TanStack
non fa parte dello stack di destinazione. Fino all'avvio dell'implementazione, le convenzioni MUI sotto riportate
descrivono il codice corrente.

La Fase 0 è conclusa. Matrice route, baseline visuali, checklist e backlog preesistente sono in
[`docs/PHASE_0_BASELINE.md`](../docs/PHASE_0_BASELINE.md). Il Quick Add mobile è rinviato e non deve essere implementato
incidentalmente durante le fondazioni.

Le Fasi 1–6 sono implementate: Tailwind v4 senza Preflight, primitive locali shadcn/Radix, `next-intl`, `next-themes`,
Sonner e il catalogo development `/design-system`. Le route legacy MUI vivono sotto `app/[locale]/(legacy)` senza
cambiare gli URL pubblici; la shell condivisa non importa MUI e le feature nuove appartengono a `(app)`. View model e
adapter puri vivono nelle rispettive feature, mentre le fixture condivise stanno in `src/lib/fixtures`. I componenti
visuali ricevono dati e stato tramite props usando il tipo discriminato `FeatureState<T>`.

Le route `/dashboard`, `/dashboard/wallet` e `/dashboard/transaction` vivono nel gruppo `(app)` e usano `/api/v1`;
wallet supporta creazione/modifica, preferiti ed eliminazione, mentre i movimenti usano filtri e paginazione server-side.
Le fixture restano per preview e test. Il client di risorse è `src/lib/api/client.ts`; `useApi` è mantenuto soltanto
come adapter callback delle form account legacy.

La shell `AppShell` centralizza header, navigazione desktop, Sheet mobile, stato sessione e selettore lingua. Login,
registrazione, conferma email, reinvio e recupero password vivono nel route group `(auth)`, quindi non ricevono la
shell dashboard. Il browser usa la sessione Identity tramite cookie HttpOnly e antiforgery: non leggere, salvare o
inviare token di autenticazione da JavaScript. Le precedenti URL dashboard di login/registrazione eseguono un redirect
temporaneo.

Vitest, Testing Library, `user-event` e `jest-dom` sono configurati senza forzare peer dependency. Playwright verrà
aggiunto insieme agli smoke test della prima slice migrata.

Durante la transizione:

- una route dichiarata migrata non deve importare MUI;
- il nuovo codice usa token semantici e primitive condivise, non valori visuali ad hoc;
- Next.js App Router resta il router dell'applicazione;
- il frontend contiene soltanto stato e validazione di presentazione; la logica pesante resta nel backend;
- le tabelle usano shadcn e semplice stato React fino alla futura integrazione backend;
- desktop e mobile condividono campi, componenti e stato del form;
- i nuovi form usano React Hook Form solo per stato, errori e submit; le regole di dominio restano nel backend;
- importi immessi dall'utente vengono normalizzati una volta nel boundary di presentazione con la locale attiva;
- il `DateRangeField` scambia `Date` con il calendario e converte a Day.js nel suo boundary;
- Day.js è l'unica libreria data;
- temi chiaro e scuro usano gli stessi token, incluso il rosso di brand parametrico;
- login e registrazione restano fuori dalla shell dashboard;
- il catalogo componenti è una route interna leggera, non Storybook.
- `docs/dashboard_mockup.png` è la baseline visuale ufficiale;
- nei testi UI usare “movimento”; mantenere `Transaction` nei nomi tecnici esistenti;
- non implementare le funzionalità future mostrate nel mockup se non vengono richieste esplicitamente.
- durante la convivenza con MUI, Tailwind Preflight resta disabilitato; verrà abilitato e verificato solo dopo l'ultima
  route legacy;
- il tema applicativo parte da quello di sistema e conserva l'eventuale scelta esplicita.

## Internazionalizzazione

Seguire [INTERNATIONALIZATION.md](../docs/INTERNATIONALIZATION.md).

- Nessun testo utente significativo hard-coded nelle slice migrate.
- Usare chiavi semantiche e namespace per feature.
- Usare i formatter condivisi per valuta, percentuali e date.
- Day.js gestisce parsing e calcoli; next-intl/Intl gestisce la presentazione localizzata.
- Usare il navigation wrapper locale-aware invece di importare direttamente le API Next.js nelle feature.
- L'inglese è il fallback deterministico; non usare `Accept-Language` per cambiare automaticamente la prima visita.
- Non tradurre nomi o descrizioni inseriti dall'utente.
- Non aggiungere chiavi per funzionalità future fuori scope.

## Ordine nel componente

All'interno di un componente React, usa questo ordine:

1. hook di contesto e routing;
2. stato e ref;
3. `useEffect`;
4. funzioni che caricano dati dalle API, chiamate `load...` o `reload...`;
5. funzioni di supporto;
6. handler degli eventi, con suffisso `Handler`;
7. funzioni di rendering locali;
8. `return` JSX.

Quando un `useEffect` usa una funzione di caricamento dichiarata più avanti, la funzione deve essere stabile
(`useCallback`) oppure l'effetto deve contenere direttamente l'operazione. Evita di disabilitare
`react-hooks/exhaustive-deps` senza annotare il motivo reale.

## Nomi

- Componenti e file componente: `PascalCase`.
- Hook: prefisso `use`.
- Caricamento remoto: `loadWallets`, `reloadTransactions`, `loadUserInformation`.
- Eventi: `saveHandler`, `closeDialogHandler`, `changePageHandler`.
- Booleani: prefissi `is`, `has`, `show` o `open`.
- Tipi importati: usa `import type` per rispettare `consistent-type-imports`.

## Chiamate API

Le risorse v1 passano da `src/lib/api/client.ts`; non creare istanze Axios direttamente nelle pagine. Ogni chiamata che modifica uno stato di
caricamento deve decrementarlo anche in caso di errore usando `onFinish`.

Il wrapper `ApiRequest` non restituisce oggi una Promise dalla funzione `execute`. Finché non verrà rifattorizzato,
gestisci successo, errore e fine con i callback disponibili e non usare `await execute()`.

## Form

- Definisci le regole in un oggetto `FormSettings` vicino al componente o esportale solo se sono davvero condivise.
- Non affidarti al cast TypeScript per convertire valori runtime: gli input testuali restano stringhe e vanno convertiti
  esplicitamente prima della richiesta.
- Mostra gli errori del backend sul campo corretto quando esiste una corrispondenza; usa una snackbar per errori
  generali.

## Controlli prima di una modifica

```powershell
npm run typecheck
npm run lint
npm run test
npm run format:check
```

La build usa `next/font` con Google Fonts e richiede una catena TLS valida oppure una strategia di font locale.

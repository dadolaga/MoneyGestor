# Internazionalizzazione frontend

Stato: stack, lingue iniziali, strategia URL e rilevamento confermati.

## Obiettivo

Rendere MoneyGestor multilingua senza spargere condizioni, testi o formattatori nelle pagine. L'internazionalizzazione deve essere una fondazione del nuovo frontend Tailwind/shadcn, non un'aggiunta successiva.

La soluzione scelta è `next-intl`, integrata con Next.js App Router. Offre dizionari locali, messaggi ICU, API per Server e Client Components, formattazione di numeri/date e navigazione consapevole della lingua.

## Decisioni confermate

- Inglese come lingua predefinita.
- Inglese e italiano come prime lingue; altre lingue aggiungibili senza cambiare componenti.
- Prefisso URL solo per le lingue non predefinite: `/dashboard` in inglese, `/it/dashboard` in italiano.
- Pathname tecnici non tradotti: `dashboard`, `wallet` e `transaction` restano stabili negli URL.
- Nessun rilevamento automatico tramite `Accept-Language`: la prima visita è sempre in inglese.
- La lingua è determinata dall'URL: assenza del prefisso significa inglese, `/it` significa italiano. Non serve un cookie di preferenza nella prima fase.
- Selettore lingua nell'area utente dell'header e, nelle pagine di autenticazione, in alto a destra.
- La scelta della lingua conserva route, parametri e query string correnti.
- Dizionari salvati nel repository; nessun servizio di traduzione esterno nella prima fase.
- Testi inglesi come riferimento strutturale dei dizionari; la terminologia italiana resta definita nel glossario.

La modalità `localePrefix: 'as-needed'` mantiene gli URL della lingua predefinita senza prefisso e rende esplicito l'italiano con `/it`.

## Struttura proposta

```text
frontend/
|-- messages/
|   |-- it/
|   |   |-- common.json
|   |   |-- auth.json
|   |   |-- dashboard.json
|   |   |-- movements.json
|   |   `-- wallets.json
|   `-- en/
|       `-- ...
`-- src/
    |-- app/
    |   `-- [locale]/
    |       |-- (auth)/
    |       |-- (legacy)/dashboard/
    |       `-- (app)/dashboard/
    `-- i18n/
        |-- config.ts
        |-- navigation.ts
        |-- request.ts
        `-- messages.ts
```

I file per dominio evitano un singolo JSON enorme. `messages.ts` li compone per la locale richiesta e permette di inviare ai Client Components soltanto i namespace necessari quando utile. Il catalogo inglese è la fonte dei tipi TypeScript; un controllo automatico verifica che quello italiano abbia le stesse chiavi.

## Come funzionano i JSON

Ogni lingua contiene la stessa struttura di chiavi; cambia soltanto il testo. Il componente chiede una chiave stabile e `next-intl` seleziona il JSON della lingua attiva.

`messages/en/movements.json`:

```json
{
  "Movements": {
    "title": "Transactions",
    "actions": {
      "add": "New transaction"
    },
    "summary": "{count, plural, =0 {No transactions} one {# transaction} other {# transactions}}"
  }
}
```

`messages/it/movements.json`:

```json
{
  "Movements": {
    "title": "Movimenti",
    "actions": {
      "add": "Nuovo movimento"
    },
    "summary": "{count, plural, =0 {Nessun movimento} one {# movimento} other {# movimenti}}"
  }
}
```

Nel componente React non si importa direttamente uno dei due file:

```tsx
const t = useTranslations('Movements');

return (
    <>
        <h1>{t('title')}</h1>
        <button>{t('actions.add')}</button>
        <p>{t('summary', { count: movements.length })}</p>
    </>
);
```

Con locale `en` il componente mostra “Transactions”; con locale `it` mostra “Movimenti”. Variabili e plurali vengono risolti dal messaggio ICU, quindi non servono condizioni come `locale === 'it'` dentro la pagina.

I file JSON non contengono JSX, funzioni o logica. Contengono soltanto messaggi. Importi, date e percentuali non vanno scritti nei JSON: vengono formattati con le API locale-aware e poi interpolati quando necessario.

## Convenzioni delle chiavi

Usare chiavi semantiche, non il testo italiano come chiave:

```json
{
  "Movements": {
    "title": "Movimenti",
    "actions": {
      "add": "Nuovo movimento",
      "delete": "Elimina movimento"
    },
    "empty": {
      "title": "Nessun movimento",
      "description": "Aggiungi il primo movimento per iniziare."
    }
  }
}
```

Regole:

- namespace PascalCase per feature o componente condiviso;
- chiavi camelCase organizzate per significato;
- niente chiavi basate sulla posizione, come `button1` o `text2`;
- niente concatenazione di frammenti tradotti;
- plurali, select e interpolazioni usano messaggi ICU;
- testo comune davvero condiviso in `Common`; il resto resta nella feature;
- non creare traduzioni per funzionalità future fuori scope.

## Terminologia

| Concetto tecnico | Italiano UI | Inglese UI |
|---|---|---|
| transaction | movimento | transaction |
| wallet | portafoglio | wallet |
| income | entrata | income |
| expense | uscita | expense |
| transfer | trasferimento | transfer |
| saving rate | tasso di risparmio | saving rate |
| current balance | saldo attuale | current balance |

`Transaction` rimane il nome interno nel codice. Le traduzioni riguardano esclusivamente contenuti rivolti all'utente.

## Date, numeri e valuta

Multilingua e multivaluta sono problemi distinti. Finché il dominio supporta soltanto EUR:

- la valuta resta EUR;
- separatori, ordine data e nomi dei mesi seguono il mapping di formato `en -> en-GB`, `it -> it-IT`; le route continuano a usare i codici brevi `en` e `it`;
- `next-intl`/`Intl` formatta importi, percentuali, date e intervalli;
- Day.js resta l'unica libreria per parsing, selezione e calcoli delle date;
- la locale Day.js viene sincronizzata con quella dell'app;
- sono vietati `toLocaleDateString('it-IT')` e `Intl.NumberFormat('it-IT')` nelle feature;
- formati riutilizzabili come `money`, `percentage`, `shortDate` e `monthYear` vengono configurati centralmente;
- valori scambiati con un futuro backend restano neutrali: numeri e date ISO, mai stringhe già localizzate.

L'input monetario deve accettare il formato naturale della lingua attiva, ma produrre un valore numerico neutrale per l'adapter.

## Componenti e messaggi

- Server Components: `getTranslations` quando possibile.
- Client Components: `useTranslations` nel componente che presenta il testo.
- Metadati: titolo e descrizione localizzati.
- Toast, dialog, empty state e messaggi di validazione usano chiavi, mai stringhe hard-coded.
- Le primitive shadcn restano neutrali; le etichette appartengono ai componenti condivisi o alle feature.
- Errori futuri del backend vengono tradotti tramite codice stabile → chiave locale. Il testo tecnico del server non va mostrato direttamente.
- Testo dinamico inserito dall'utente, come nomi di wallet e descrizioni, non viene tradotto.

## Routing e selettore lingua

Tutte le route dell'app saranno sotto `app/[locale]`. La configurazione proposta usa:

- `locales: ['en', 'it']`;
- `defaultLocale: 'en'`;
- `localePrefix: 'as-needed'`;
- `localeDetection: false`;
- `localeCookie: false`.

Il progetto usa attualmente Next.js 15: l'integrazione dovrà quindi usare `middleware.ts`, non il nome `proxy.ts` adottato dalle versioni più recenti di Next.js. La versione di `next-intl` sarà fissata nel lockfile e verificata esplicitamente con Next.js 15 e React 19 prima di spostare le route.

I componenti devono importare `Link`, `redirect`, `useRouter` e `usePathname` dal wrapper locale in `src/i18n/navigation.ts`, non direttamente da Next.js, salvo casi documentati.

Il selettore mostra lingua corrente e nome nativo (`Italiano`, `English`). Al cambio lingua conserva route, parametri e query string. Se un form è modificato, chiede conferma prima della navigazione; confermando, lo stato locale non salvato viene scartato.

## Design e layout

- Nessun testo è dimensionato assumendo la lunghezza italiana.
- Pulsanti e tab usano padding, non larghezze fisse.
- Tabelle e card devono tollerare testi inglesi più lunghi.
- Il catalogo `/design-system` mostra almeno inglese e italiano.
- I mockup mobile vanno verificati in entrambe le lingue.
- LTR è sufficiente per le lingue iniziali; il supporto RTL non è richiesto ora, ma non va reso impossibile con layout fragili.

## Migrazione incrementale

1. Installare e configurare `next-intl` insieme alle fondamenta Tailwind/shadcn.
2. Spostare le route sotto `[locale]` senza cambiare il loro contenuto, usando l'integrazione `middleware.ts` compatibile con Next.js 15 e `localeDetection: false`.
3. Introdurre configurazione, navigation wrapper e language switcher.
4. Creare dizionari `Common`, `Navigation` e `Metadata`.
5. Estrarre le stringhe per slice nello stesso momento in cui la slice viene migrata da MUI.
6. Centralizzare formatter e rimuovere locale `it-IT` hard-coded.
7. Aggiungere italiano alla slice prima di dichiararla conclusa.
8. Eliminare le ultime stringhe UI hard-coded al consolidamento finale.

Non conviene tradurre in anticipo tutto il codice MUI destinato a essere sostituito: ogni stringa viene estratta quando il relativo componente entra nel nuovo sistema.

## Controlli

Per ogni slice:

- parità delle chiavi fra `it` ed `en`;
- nessuna stringa UI significativa hard-coded;
- nessuna chiave orfana;
- rendering italiano e inglese;
- formattazione EUR, percentuale, data e intervallo;
- cambio lingua sulla stessa route;
- mantenimento della lingua dopo refresh grazie all'URL;
- assenza di overflow nei viewport concordati;
- fallback controllato per locale o chiave non valida.

## Definition of Done

- tutte le route applicative sono locale-aware;
- inglese e italiano coprono il 100% dello scope implementato;
- ogni testo utente proviene da un dizionario o da un dato utente;
- date, numeri e valuta usano formatter centralizzati;
- nessuna feature importa direttamente API di navigazione non locale-aware;
- aggiungere una nuova lingua richiede registrare locale, mapping regionale Day.js/Intl e dizionari;
- README, design system e AGENTS descrivono le stesse convenzioni.

## Esempi di comportamento

| Situazione | Risultato |
|---|---|
| Prima visita a `/dashboard` | inglese, indipendentemente dalla lingua del browser |
| Selezione di Italiano | navigazione a `/it/dashboard` |
| Visita esplicita a `/it/wallet` | italiano |
| Ritorno a English | stessa route senza `/it` |
| Cambio lingua con form modificato | conferma prima di scartare i dati locali |

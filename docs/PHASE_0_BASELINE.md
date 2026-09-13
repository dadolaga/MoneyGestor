# Fase 0 — decisioni e baseline frontend

Stato: completata il 13 settembre 2026, con il Quick Add mobile esplicitamente rinviato dal proprietario.

Questo documento chiude le decisioni e raccoglie la baseline necessaria per iniziare la Fase 1. Non modifica il
contratto API, il backend o la logica di dominio.

## Perimetro

La baseline copre i flussi esistenti di autenticazione, dashboard, portafogli e movimenti. La route sperimentale
`/dashboard/transaction/add_mobile` e il prototipo “movimento in tre tocchi” sono esclusi da questa fase e saranno
riprogettati insieme in un'attività successiva.

`dashboard_mockup.png` resta la baseline visuale ufficiale di destinazione. Gli screenshot in
[`design/baseline`](design/baseline/) fotografano invece il comportamento legacy da preservare o correggere.

## Matrice route e viewport

Le baseline principali usano `1440×900` per desktop e `390×844` per mobile. Le verifiche delle slice migrate
aggiungeranno `360×800` e `768×1024`, come già richiesto dal piano.

| Route legacy | Flusso | Stato richiesto | Desktop | Mobile | Destinazione |
|---|---|---|---|---|---|
| `/` | ingresso | redirect | checklist | checklist | `/dashboard` o `/it/dashboard` |
| `/dashboard/user/login` | login | vuoto, errore, pending, successo | screenshot | screenshot | `/login`, `/it/login` |
| `/dashboard/user/new` | registrazione | vuoto, validazione, pending, successo | screenshot | screenshot | `/register`, `/it/register` |
| `/dashboard` | riepilogo | loading, empty, error, dati | screenshot dati | screenshot dati | invariata sotto `[locale]` |
| `/dashboard/wallet` | portafogli | loading, empty, error, dati, dialog | screenshot dati | screenshot dati | invariata sotto `[locale]` |
| `/dashboard/transaction` | movimenti | loading, empty, error, dati, filtri, dialog | screenshot dati | screenshot dati | invariata sotto `[locale]` |
| `/dashboard/transaction/add_mobile` | form mobile sperimentale | — | esclusa | esclusa | da definire con Quick Add |
| `/dashboard/error` | errore globale | errore | checklist | checklist | fase 9 |
| `/dashboard/not_implemented` | pagina placeholder legacy | statico | checklist | checklist | rimozione o fase 9 |

Gli screenshot disponibili sono elencati nel [README della baseline](design/baseline/README.md).

## Metodo di acquisizione

- Next.js 15.4.2 in modalità development.
- Chrome headless locale, senza servizi o account esterni.
- Dati esclusivamente fittizi serviti da un mock HTTP effimero e non conservato nel repository.
- Nessuna credenziale reale e nessuna scrittura sul database.
- Tema legacy dark, unico tema effettivamente disponibile prima della migrazione.

Gli screenshot pubblici senza backend registrano anche la snackbar `Server error`; è comportamento legacy osservato,
non parte della destinazione.

## Checklist funzionale da preservare

### Sessione e navigazione

- [ ] `/` porta alla dashboard.
- [ ] Una sessione valida mostra nome e avatar.
- [ ] Una sessione assente o scaduta porta al login con feedback coerente.
- [ ] Logout rimuove il token locale e porta al login.
- [ ] Header e navigazione espongono dashboard, portafogli e movimenti senza duplicare route mobile.

### Login e registrazione

- [ ] Login invia username/email, password e opzione “ricordami”.
- [ ] Login conserva il token restituito e porta alla dashboard.
- [ ] Registrazione valida nome, cognome, username, email, password e conferma.
- [ ] Pending e fallimento impediscono submit duplicati e mostrano un errore utile.
- [ ] Login e registrazione di destinazione restano fuori dalla shell dashboard.

### Dashboard

- [ ] L'intervallo iniziale copre il mese corrente.
- [ ] Il cambio intervallo ricarica entrate, uscite, saving rate e distribuzioni.
- [ ] L'aggiunta di un movimento aggiorna il riepilogo alla chiusura del dialog.
- [ ] Loading, empty ed error non mostrano valori ingannevoli.
- [ ] Entrate e uscite sono distinguibili anche senza affidarsi soltanto al colore.

### Portafogli

- [ ] Elenco, totale e grafico usano la stessa collezione aggiornata.
- [ ] Creazione e modifica ricaricano lista e grafico.
- [ ] Preferito ed eliminazione aggiornano lo stato visibile.
- [ ] Nome, colore, saldo e azioni rimangono disponibili su mobile.
- [ ] Loading, empty, error e conferma distruttiva sono espliciti.

### Movimenti

- [ ] Lista, ordinamento server-side, filtri e paginazione mantengono i parametri correnti.
- [ ] Creazione e modifica condividono campi e stato fra desktop e mobile.
- [ ] Il trasferimento distingue origine e destinazione.
- [ ] Importo e direzione producono il segno corretto nel payload.
- [ ] Eliminazione mostra descrizione e importo del movimento selezionato.
- [ ] Data, descrizione, importo e portafoglio restano leggibili su mobile.

## Backlog funzionale separato

Questi difetti sono preesistenti e non devono essere confusi con regressioni della migrazione visuale.

| ID | Area | Difetto osservato | Trattamento previsto |
|---|---|---|---|
| `AUTH-01` | auth | login e registrazione sono ancora dentro la shell dashboard | fase 5 |
| `AUTH-02` | auth | l'header interroga `/user/info` anche nelle pagine pubbliche e mostra `Server error` se il backend non risponde | fase 4/5 |
| `RESP-01` | auth | login e registrazione debordano orizzontalmente a `390×844` | fase 5 |
| `RESP-02` | dashboard | header pagina, KPI e grafici restano su una griglia desktop e vengono tagliati su mobile | fase 8 |
| `RESP-03` | wallet | il grafico resta affiancato alla tabella ed è quasi completamente fuori viewport su mobile | fase 6 |
| `RESP-04` | movimenti | la tabella mobile perde importo, portafoglio e azioni visibili | fase 7 |
| `WAL-01` | wallet | l'icona sort cambia ma i dati non vengono ordinati | fase 6 |
| `WAL-02` | wallet | il colore riga concatena l'oggetto colore a `#` | fase 6 |
| `TX-01` | movimenti | il valore testuale viene trattato come numero senza conversione runtime affidabile | fase 3/7 |
| `TX-02` | movimenti | il controllo entrata/uscita non applica sempre il segno inviato | fase 7 |
| `TX-03` | movimenti | `DeleteDialog` non rende il messaggio quando riceve una funzione | fase 3/7 |
| `DASH-01` | dashboard | il saving rate può dividere per zero | fase 8 |
| `BUILD-01` | fondazioni | i font Google causano download di rete e fallimento TLS in build | fase 1 |
| `I18N-01` | trasversale | testi e formatter italiani sono hard-coded | per slice, da fase 1 |

## Versioni e riproducibilità

Il lockfile corrente resta la fonte riproducibile e va installato con `npm ci`. Baseline risolta:

| Pacchetto/tool | Versione |
|---|---:|
| Node.js | 22.14.0 |
| npm | 10.9.2 |
| Next.js | 15.4.2 |
| React / React DOM | 19.1.0 |
| TypeScript | 5.8.3 |
| ESLint | 9.31.0 |
| Prettier | 3.8.1 |
| MUI | 7.2.0 |
| MUI X Date Pickers | 8.9.0 |
| Day.js | 1.11.18 |

Pin iniziali approvati per la Fase 1; l'installazione dovrà scrivere le versioni risolte nel lockfile e il diff della
CLI shadcn dovrà essere revisionato:

| Fondazione | Versione iniziale |
|---|---:|
| Tailwind CSS / `@tailwindcss/postcss` | 4.3.3 |
| shadcn CLI | 4.21.0 |
| next-intl | 4.14.0 |
| next-themes | 0.4.6 |
| lucide-react | 1.45.0 |
| Vitest | 5.0.0 |

Le dipendenze delle singole primitive shadcn e di Testing Library saranno bloccate dal medesimo `package-lock.json`
quando verranno introdotte; non saranno aggiunte manualmente in Fase 0.

## Decisioni strutturali chiuse

- Next.js App Router resta il router; nessun TanStack.
- Tailwind CSS v4 e shadcn `new-york` su Radix, con token semantici OKLCH.
- Preflight resta disabilitato finché esistono route MUI.
- Tema iniziale `system`, temi light/dark e scelta persistita con `next-themes`.
- Rosso di brand parametrico distinto dal rosso distruttivo.
- Font locale o stack di sistema; nessun download font in build/runtime.
- next-intl con inglese senza prefisso, italiano sotto `/it` e nessun rilevamento browser.
- Catalogo UI interno `/design-system`, disponibile soltanto in sviluppo.
- Login e registrazione fuori dalla shell applicativa.
- Day.js per parsing/calcoli e next-intl/Intl per presentazione.
- Vitest e Testing Library per unit/component test; Playwright per smoke test.
- `dashboard_mockup.png` resta la fonte visuale di destinazione.
- Il Quick Add non condiziona le fondazioni: requisiti, preset e conteggio dei tocchi saranno decisi più avanti.

## Criterio di uscita della Fase 0

La direzione visuale, lo stack, il routing, il tema, l'i18n, il perimetro, le baseline e il backlog sono espliciti.
L'unico tema deliberatamente non deciso è il Quick Add, rimosso dal gate della Fase 0 su richiesta del proprietario.
La Fase 1 può iniziare senza assumere dettagli di quel flusso.


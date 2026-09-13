# Sistema visuale MoneyGestor

Stato: fondamenta runtime della Fase 1 e boundary visuale della Fase 2 implementati il 13 settembre 2026. Baseline e backlog sono in
[`PHASE_0_BASELINE.md`](PHASE_0_BASELINE.md); il Quick Add mobile è rinviato e non condiziona le fondazioni.

Questo documento impedisce che ogni pagina sviluppi un proprio stile durante e dopo la migrazione a Tailwind e shadcn/ui. Le decisioni approvate qui diventano vincolanti per primitive, feature e route.

## Adozione Fase 1

- `frontend/components.json` definisce shadcn `new-york`, alias locali e CSS variables; le primitive sono possedute
  dal repository in `frontend/src/components/ui`.
- Sono disponibili `Button`, `Card`, `Input`, `Label`, `Checkbox`, `Dialog`, `AlertDialog`, `Select`,
  `DropdownMenu`, `Sheet`, `Skeleton`, `Progress`, `Table`, `Popover`, `Calendar`, `Badge`, `Avatar`, `Separator`
  e `Sonner`.
- I token semantici light/dark sono in `frontend/src/app/globals.css`, in OKLCH. Il tema iniziale segue il sistema e
  l'eventuale scelta utente è gestita da `next-themes`.
- Tailwind importa solo `theme` e `utilities`: Preflight rimane disabilitato finché esistono route MUI.
- `/design-system` e `/it/design-system` sono disponibili soltanto in development e mostrano le fondamenta nelle due
  lingue iniziali.
- Il catalogo include dashboard, portafogli e movimenti con fixture realistiche e selezione degli stati `idle`,
  `loading`, `ready`, `empty` ed `error`; i componenti non avviano richieste remote.

Le regole linguistiche e di formattazione sono definite in [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).

## Principi

- Finanze leggibili prima della decorazione: importi, segno, valuta e stato devono essere immediati.
- Una sola gerarchia visiva: titolo pagina, azione primaria, filtri, contenuto, azioni secondarie.
- Colore semantico, non ornamentale: verde per entrate/successo, rosso per uscite/pericolo, colore brand per azioni primarie.
- Mobile non è un'app separata: stessi contenuti e regole, composizione adattata.
- Accessibilità non bloccante nella prima fase, preservando comunque semantica HTML e comportamento base delle primitive Radix.
- Densità controllata: tabelle desktop compatte; form e mobile più ariosi.

## Riferimento ufficiale

Il riferimento ufficiale è [dashboard_mockup.png](dashboard_mockup.png). Tutte le pagine, le primitive e gli stati devono sembrare parti dello stesso prodotto rappresentato nel mockup.

La direzione unisce solidità da prodotto finanziario e immediatezza da fintech moderno: superfici chiare e pulite, card morbide, ombre leggere, alta densità informativa, tipografia netta e rosso energico per il brand e le azioni principali. Il rosso deve essere completamente parametrizzabile tramite token. Il tema scuro dovrà essere una traduzione fedele dello stesso sistema, non un design differente.

Il mockup è un riferimento visuale, non una specifica funzionale. Ricerca globale, notifiche, categorie, budget, obiettivi, report, export, stato dei movimenti e andamento storico non fanno parte della migrazione attuale e non devono essere implementati come placeholder. Potranno essere valutati in futuro.

I token iniziali sono i seguenti; i valori precisi verranno campionati e rifiniti nel catalogo, ma le feature useranno esclusivamente questi nomi semantici:

```text
background, foreground
card, card-foreground
popover, popover-foreground
primary, primary-foreground
secondary, secondary-foreground
muted, muted-foreground
accent, accent-foreground
destructive, destructive-foreground
border, input, ring
income, expense, transfer, warning
chart-1 ... chart-6
```

I colori dei wallet sono dati utente e fanno eccezione, ma testo e bordo sopra tali colori devono rispettare il contrasto.

Baseline cromatica derivata dal mockup:

| Ruolo                     | Direzione iniziale                                                 |
| ------------------------- | ------------------------------------------------------------------ |
| `primary`                 | rosso brand energico, configurabile e distinto dal rosso di errore |
| `background`              | grigio-blu molto chiaro in light; blu-nero neutro in dark          |
| `card`                    | bianco in light; superficie leggermente elevata in dark            |
| `foreground`              | blu notte in light; quasi bianco in dark                           |
| `muted-foreground`        | grigio-blu leggibile                                               |
| `border`                  | bordo freddo e discreto                                            |
| `income`                  | verde semantico                                                    |
| `expense` / `destructive` | rosso semantico, non automaticamente uguale a `primary`            |
| `transfer`                | blu semantico                                                      |
| `warning`                 | ambra                                                              |

L'implementazione usa CSS variables shadcn in OKLCH. Il catalogo è la sede per calibrare i valori, non le singole pagine. Il tema iniziale segue il sistema operativo e una scelta manuale viene persistita.

## Regole non negoziabili

- Nessun hex di prodotto dentro le pagine.
- Nessun `style={{ ... }}` per layout o tema quando esiste una utility/token.
- Nessuna classe Tailwind arbitraria ripetuta: se ricorre, diventa token o componente.
- Nessun uso diretto delle primitive Radix nelle feature: passare dai componenti shadcn locali.
- Nessun import MUI in una route dichiarata migrata.
- Nessuna variante visuale ad hoc senza nome e motivazione.
- Nessun testo utente significativo hard-coded nei componenti migrati.
- Tutti i pulsanti solo-icona hanno accessible name e tooltip quando il significato non è ovvio.
- Entrate e uscite hanno segno/testo/icona oltre al colore.

## Tipografia

Decisioni iniziali:

- stack di sistema come fallback immediato e nessun download di font in build;
- un solo font locale eventuale, introdotto soltanto se migliora davvero la fedeltà al mockup;
- nessuna famiglia display separata nella prima fase;
- scala e peso definiti centralmente nei token.

Scala proposta:

| Ruolo         | Uso                                         |
| ------------- | ------------------------------------------- |
| display       | solo schermate marketing/errore eccezionali |
| page title    | un solo `h1` per route                      |
| section title | gruppi principali                           |
| card title    | KPI e pannelli                              |
| body          | contenuto standard                          |
| label         | controlli e tabelle                         |
| caption       | metadati e aiuti                            |

Font remoti caricati a build o runtime non sono ammessi. Il font va incluso localmente o si usa uno stack di sistema.

## Spaziatura e layout

- Un'unica scala basata su multipli coerenti.
- Larghezza e padding pagina gestiti da un componente `PageContainer`.
- Titolo e azione primaria gestiti da `PageHeader`.
- Dashboard costruite con una griglia responsiva condivisa.
- Tabelle dentro superfici con bordo e toolbar coerenti.
- Su mobile, azione primaria raggiungibile senza attraversare tutta la pagina.
- Layout e controlli devono assorbire testi di lunghezza diversa senza larghezze costruite sull'italiano.

Breakpoint e larghezze precise saranno fissati dopo gli screenshot di riferimento. Non usare il rilevamento JavaScript per cambiare solo il layout. Login e registrazione vivono fuori dalla shell dashboard.

## Superfici

Definire una sola scala per:

- raggio di input/button;
- raggio card/dialog;
- bordo standard;
- ombra popover/dialog;
- overlay modale.

Card KPI, filtri, tabelle e dialog devono riusare questi valori.

## Componenti condivisi richiesti

Oltre alle primitive shadcn:

- `AppShell`, `AppHeader`, `AppSidebar`;
- `PageContainer`, `PageHeader`;
- `MoneyValue`, con segno e formattazione della locale attiva;
- `WalletBadge`, con contrasto verificato;
- `LoadingState`, `EmptyState`, `ErrorState`;
- `ConfirmDeleteDialog`;
- `FormField` e campi specializzati;
- `DateRangeField`, basato su Day.js;
- `DataTable`, `DataTableToolbar`, `DataTablePagination`;
- `KpiCard`;
- `ChartContainer` e legenda accessibile.

Ogni componente deve documentare varianti, stati e casi limite nel catalogo UI scelto.

Le primitive di form della Fase 3 vivono in `src/components/shared`: `FormField`, `TextField`, `PasswordField`,
`AmountField`, `CheckboxField`, `SelectField`, `DateRangeField` e `ConfirmDeleteDialog`. I campi condivisi non
incorporano regole di dominio; gli importi passano dal normalizzatore locale al payload di presentazione e il date
range converte da `Date` del calendario a Day.js al boundary.

## Form

- Label sempre visibile; il placeholder non sostituisce la label.
- Errori vicino al campo e summary quando il submit fallisce su più campi.
- Stato pending disabilita azioni incompatibili e mostra progresso senza salto di layout.
- Valori iniziali, reset e chiusura dialog hanno comportamento esplicito.
- Importi accettano il formato della locale attiva e vengono normalizzati una volta.
- Select di wallet e tipo mostrano loading, vuoto e possibilità di ricerca quando utile.
- Il trasferimento rende chiari origine, direzione e destinazione.

## Tabelle e liste

Desktop:

- header sticky solo quando il contenitore ha altezza e scroll prevedibili;
- colonna importo allineata a destra con cifre tabulari;
- sort solo sulle colonne realmente supportate dalla futura fonte dati;
- azioni in menu o pulsanti con target adeguato;
- paginazione coerente con il conteggio server.

Mobile:

- non comprimere tutte le colonne;
- preferire righe a due livelli o card compatte;
- mantenere visibili data, descrizione, importo e portafoglio;
- filtri in Sheet/Drawer con riepilogo dei filtri attivi.

## Feedback

- Skeleton per caricamento iniziale.
- Dati precedenti visibili con indicatore discreto durante refetch.
- Empty state contestuale con azione utile.
- Errori recuperabili inline; toast per conferme o errori trasversali.
- Dialog di conferma solo per azioni distruttive o irreversibili.
- Testi dalla locale attiva, con glossario coerente. In italiano: “portafoglio”, “movimento”, “entrata”, “uscita”, “trasferimento”. `Transaction` resta ammesso nei nomi tecnici interni.
- Ogni slice completata deve essere disponibile in tutte le lingue abilitate.

## Grafici

- Palette derivata da `chart-1...chart-6`, distinta da success/error.
- Tooltip con valore in EUR e nome categoria.
- Legenda leggibile e navigabile.
- Alternativa testuale o tabellare per dati essenziali.
- Nessun grafico comunica informazioni solo con il colore.
- Empty state al posto di grafici vuoti.

## Accessibilità

L'applicazione è inizialmente personale e l'accessibilità non è un gate di rilascio. Le seguenti caratteristiche sono best-effort e non bloccanti; non vanno però rimosse quelle già offerte da Radix e dall'HTML semantico:

- Focus ring visibile su ogni controllo.
- Contrasto leggibile per testo e controlli.
- Target touch ampi, soprattutto nel Quick Add mobile.
- Navigazione completa da tastiera.
- Dialog con titolo, descrizione, focus iniziale e ritorno focus.
- Tabelle con header semantici e stato sort annunciabile.
- Rispetto di `prefers-reduced-motion`.
- Zoom 200% senza perdita di contenuto o funzionalità.

## Processo di approvazione visuale

1. usare `dashboard_mockup.png` come baseline desktop;
2. derivare una variante dark con la stessa gerarchia;
3. preparare il riferimento mobile per Quick Add, lista movimenti e navigazione;
4. fissare token e componenti nel catalogo UI;
5. usare screenshot di regressione per impedire deviazioni accidentali.

Le immagini di riferimento, se create, vanno salvate in `docs/design/` con viewport e stato nel nome file. Non sono implementazione e non sostituiscono i criteri accessibili.

## Quick Add mobile

Il flusso prioritario deve permettere di registrare un movimento ordinario mentre si è fuori casa con un obiettivo di tre tocchi, senza contare la digitazione dell'importo. La prima proposta è:

1. tocco sul comando globale “Aggiungi”;
2. tocco su un preset recente/preferito che precompila tipo e wallet;
3. tocco su “Salva” dopo aver digitato l'importo.

Data e ora sono automatiche. Wallet preferito e ultimo tipo o preset usato possono essere precompilati. Descrizione, categoria, data e wallet restano modificabili tramite “Altri dettagli”. Trasferimenti e casi complessi usano il form completo e non sono vincolati ai tre tocchi.

La disposizione definitiva deve essere validata con un mockup mobile reale.

## Checklist di review UI

- usa soltanto token semantici;
- riusa i componenti condivisi;
- include loading, empty, error e disabled;
- funziona nei viewport concordati;
- conserva il comportamento base di tastiera e focus delle primitive usate;
- non duplica logica fra desktop e mobile;
- non introduce import legacy nell'area migrata;
- aggiorna catalogo e documentazione quando aggiunge una variante.

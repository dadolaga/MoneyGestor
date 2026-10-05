# Baseline visuale legacy

Questa cartella contiene gli screenshot di riferimento acquisiti prima della migrazione UI. I file `*_dark.png`
fotografano il tema legacy corrente; non sono mockup della destinazione.

| Flusso | Desktop `1440×900` | Mobile `390×844` |
|---|---|---|
| login | `login_1440x900_dark.png` | `login_390x844_dark.png` |
| registrazione | `register_1440x900_dark.png` | `register_390x844_dark.png` |
| dashboard con dati | `dashboard_1440x900_dark.png` | `dashboard_390x844_dark.png` |
| portafogli con dati | `wallet_1440x900_dark.png` | `wallet_390x844_dark.png` |
| movimenti con dati | `transactions_1440x900_dark.png` | `transactions_390x844_dark.png` |

Le immagini autenticate usano fixture locali fittizie. Login e registrazione mostrano anche lo stato di errore del
backend non disponibile, utile come evidenza del comportamento legacy da correggere.

La matrice completa, gli stati richiesti e le limitazioni dell'acquisizione sono documentati in
[`PHASE_0_BASELINE.md`](../../PHASE_0_BASELINE.md).

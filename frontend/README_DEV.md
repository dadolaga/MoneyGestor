# Convenzioni frontend

Questo file descrive le convenzioni già adottate o desiderate nel frontend. Non sostituisce ESLint e TypeScript.

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

Quando un `useEffect` usa una funzione di caricamento dichiarata più avanti, la funzione deve essere stabile (`useCallback`) oppure l'effetto deve contenere direttamente l'operazione. Evita di disabilitare `react-hooks/exhaustive-deps` senza annotare il motivo reale.

## Nomi

- Componenti e file componente: `PascalCase`.
- Hook: prefisso `use`.
- Caricamento remoto: `loadWallets`, `reloadTransactions`, `loadUserInformation`.
- Eventi: `saveHandler`, `closeDialogHandler`, `changePageHandler`.
- Booleani: prefissi `is`, `has`, `show` o `open`.
- Tipi importati: usa `import type` per rispettare `consistent-type-imports`.

## Chiamate API

Le API passano da `useApi`; non creare istanze Axios direttamente nelle pagine. Ogni chiamata che modifica uno stato di caricamento deve decrementarlo anche in caso di errore usando `onFinish`.

Il wrapper `ApiRequest` non restituisce oggi una Promise dalla funzione `execute`. Finché non verrà rifattorizzato, gestisci successo, errore e fine con i callback disponibili e non usare `await execute()`.

## Form

- Definisci le regole in un oggetto `FormSettings` vicino al componente o esportale solo se sono davvero condivise.
- Non affidarti al cast TypeScript per convertire valori runtime: gli input testuali restano stringhe e vanno convertiti esplicitamente prima della richiesta.
- Mostra gli errori del backend sul campo corretto quando esiste una corrispondenza; usa una snackbar per errori generali.

## Controlli prima di una modifica

```powershell
npm run typecheck
npm run lint
npm run format:check
```

La build usa `next/font` con Google Fonts e richiede una catena TLS valida oppure una strategia di font locale.

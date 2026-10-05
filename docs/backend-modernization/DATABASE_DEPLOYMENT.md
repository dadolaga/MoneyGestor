# Creazione e deployment del database

Il backend usa un solo database MySQL, configurato in `database.name`. Le tabelle MoneyGestor e ASP.NET Core Identity sono nello stesso database. I due `DbContext` gestiscono gruppi di tabelle diversi e condividono la tabella EF `__EFMigrationsHistory`.

## Schema corrente

La migration `20261001180542_InitialMoneyGestorSchema` crea direttamente lo schema applicativo corrente. La migration `20261001181454_InitialIdentitySchema` crea le tabelle necessarie al login. Le precedenti migration di entrambi i context e la procedura di adozione dello schema storico sono state rimosse.

`database.bootstrapMode` accetta due valori:

- `Disabled` (predefinito): non crea database e non applica migration; l'avvio richiede uno schema aggiornato.
- `Migrate`: crea il database configurato se assente e applica le migration pendenti di entrambi i context.

Se il database contiene tabelle ma non la nuova migration iniziale, l'avvio si ferma. Non elimina dati e non tenta di interpretare lo schema precedente come quello nuovo.

## Nuova installazione o ripartenza da zero

1. Fermare backend e frontend. Se i dati potrebbero servire ancora, creare un backup verificato.
2. Predisporre un **database MySQL vuoto con un nuovo nome** oppure eliminare esplicitamente il vecchio database solo dopo aver verificato nome e host. Il backend non esegue il `DROP DATABASE`.
3. Impostare `database.name` al nome scelto e `database.bootstrapMode` a `Migrate` nella configurazione locale. L'utente MySQL deve poter creare il database se assente e creare tabelle, indici e vincoli.
4. Avviare una sola istanza del backend. Lo startup applica le migration MoneyGestor e Identity, esegue il seed globale e i controlli di integrità prima di servire richieste.
5. Verificare `/health/ready`, registrazione/login, wallet e movimenti. Riportare `bootstrapMode` a `Disabled` dopo la creazione.

La configurazione locale si trova in `settings.json` o nel percorso indicato da `BACKEND_APP_SETTINGS`; lo schema di esempio è in [settings.example.json](../../settings.example.json). Non copiare password o connection string nella documentazione o nei log.

## Script EF per revisione

In un ambiente amministrativo protetto, impostare `MONEYGESTOR_DESIGN_CONNECTION_STRING` e generare gli script di entrambi i context prima di applicarli:

```powershell
dotnet tool run dotnet-ef migrations script --project backend/database/database.csproj --context MoneyGestorContext
dotnet tool run dotnet-ef migrations script --project backend/database/database.csproj --context IdentityAccountContext
```

Questi comandi generano SQL senza connettersi al database. `dotnet ef database update` invece modifica il database indicato dalla connection string e va eseguito solo sulla destinazione già verificata.

## Recovery

La migration iniziale è destinata a un database vuoto; il suo `Down` elimina le tabelle. Per tornare a dati precedenti, ripristinare un backup verificato in un database separato e usare la versione applicativa compatibile. Per backup, restore e verifica consultare [DATABASE_RECOVERY.md](DATABASE_RECOVERY.md). La [storia DB-21](evidence/DB-21_2026-09-24.md) resta solo come documentazione delle versioni precedenti.

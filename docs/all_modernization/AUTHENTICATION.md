# Autenticazione finale, spiegata in modo semplice

Questo documento descrive **il sistema di autenticazione di destinazione** di MoneyGestor, non il vecchio sistema a
token proprietario.

## In breve

MoneyGestor userà **ASP.NET Core Identity** e una **sessione tramite cookie cifrato**.

Quando un utente esegue il login:

1. invia username o email e password al backend;
2. il backend verifica la password con ASP.NET Core Identity;
3. se i dati sono corretti e l'email è confermata, il backend crea il cookie `MoneyGestor.Auth`;
4. il browser invia automaticamente quel cookie nelle richieste successive;
5. il backend legge il cookie e riconosce l'utente.

Il frontend non può leggere il cookie perché è `HttpOnly`. In produzione il cookie è anche `Secure`, quindi viene
inviato soltanto tramite HTTPS.

Non è previsto un JWT per il browser.

## Cosa sarà salvato nel database

I dati saranno divisi in due parti.

### Profilo e dati finanziari

La tabella applicativa `user` mantiene l'ID numerico storico dell'utente. Questo ID continua a essere usato come
proprietario di portafogli, movimenti, colori e tipi personali.

Il profilo contiene dati come:

- nome;
- cognome;
- username;
- email;
- ID numerico dell'utente.

### Account di accesso

La tabella Identity `AspNetUsers` contiene le informazioni necessarie per autenticare e proteggere l'account:

- ID tecnico Identity;
- collegamento univoco all'ID numerico della tabella `user` (`LegacyUserId`);
- username ed email, anche in forma normalizzata per i controlli di unicità;
- stato di conferma dell'email;
- **hash della password**;
- contatore dei login falliti e fine dell'eventuale blocco temporaneo;
- `SecurityStamp`, usato per invalidare le sessioni dopo operazioni sensibili;
- campi standard Identity predisposti per telefono e autenticazione a due fattori.

La password vera non viene salvata. Viene salvato soltanto un hash con salt, dal quale non è possibile ricostruire la
password originale. Quando un vecchio utente accede correttamente, il vecchio hash viene verificato una volta e
riscritto nel formato Identity aggiornato.

Identity crea anche tabelle standard per ruoli, claim, login esterni e token applicativi. Possono restare vuote finché
queste funzioni non vengono utilizzate. In futuro, per esempio, `AspNetUserLogins` potrà collegare un account Google
senza cambiare il sistema di sessione.

## Cosa non sarà salvato nel database

Non saranno salvati nel database:

- la password in chiaro;
- il cookie presente nel browser;
- un token di sessione proprietario;
- un refresh token JWT;
- il token antiforgery;
- i link o i token completi inviati per confermare l'email o reimpostare la password;
- una riga di database per ogni sessione del browser.

I token di conferma email e recupero password sono generati da Identity, hanno durata limitata e diventano inutilizzabili
dopo l'uso o dopo una modifica dei dati di sicurezza. Le chiavi che proteggono cookie e token sono conservate in uno
storage protetto sul server, non nelle tabelle degli utenti.

## Registrazione

La registrazione sarà pubblica e seguirà questo flusso:

1. l'utente inserisce nome, cognome, username, email e password;
2. il backend crea il profilo finanziario e l'account Identity collegato;
3. il backend invia un'email di conferma;
4. l'utente apre il link ricevuto;
5. soltanto dopo la conferma può completare il login.

Username ed email devono essere univoci. Le risposte sono volutamente generiche quando serve, così un estraneo non può
usare l'API per scoprire se una certa email è registrata.

## Login e sessione

Il login accetta username oppure email e password.

- Sessione normale: durata di 2 ore, con rinnovo durante l'uso.
- “Ricordami”: durata massima di 30 giorni.
- Dopo 5 tentativi falliti: blocco temporaneo di 15 minuti.
- Email non confermata: accesso negato.

Il cookie contiene un ticket di autenticazione cifrato e firmato. JavaScript non può leggerlo e il database non
conserva il suo valore.

## Protezione delle modifiche

Il cookie viene inviato automaticamente dal browser. Per evitare che un altro sito sfrutti questa caratteristica, le
richieste che modificano dati devono includere anche un token antiforgery nell'header `X-CSRF-TOKEN`.

In pratica, per creare, modificare o eliminare qualcosa servono entrambi:

- il cookie di autenticazione valido;
- il token antiforgery valido.

Il backend accetta richieste con credenziali soltanto dalle origini configurate.

## Logout e revoca

Il logout elimina il cookie di autenticazione dal browser.

Quando cambia la password o un dato di sicurezza, Identity aggiorna il `SecurityStamp`. Le sessioni create con il
vecchio valore vengono quindi rifiutate. In questo modo il backend può invalidare sessioni già emesse senza conservare
nel database un elenco dei cookie.

## Recupero password

Il recupero segue questo flusso:

1. l'utente inserisce la propria email;
2. il backend risponde in modo generico, sia che l'account esista sia che non esista;
3. se l'account esiste ed è confermato, viene inviata un'email con un token temporaneo;
4. l'utente sceglie una nuova password;
5. Identity salva il nuovo hash e invalida le sessioni precedenti.

Il token scade dopo un'ora ed è utilizzabile una sola volta nel flusso previsto.

## Cosa sparirà alla fine della migrazione

Il vecchio sistema usa la tabella `login`, con token proprietari salvati in chiaro. Questa tabella e il relativo
protocollo saranno rimossi quando tutte le API e tutti i consumer useranno Identity.

La vecchia colonna `user.Password` non è già più la fonte della password per i nuovi account: oggi contiene il marcatore
`IDENTITY_MANAGED`. Nel modello finale la password appartiene esclusivamente a `AspNetUsers.PasswordHash`; la rimozione
fisica della vecchia colonna dovrà essere eseguita con una migration dedicata e verificata.

Durante la transizione il collegamento è questo:

```text
user.Id  <----  AspNetUsers.LegacyUserId
   |
   +---- proprietario di portafogli e movimenti

AspNetUsers
   +---- credenziali, conferma email, blocco e sicurezza account
```

Quando la compatibilità legacy sarà stata eliminata, il browser e la nuova API non useranno più token grezzi.

## Riassunto finale

```text
PASSWORD INSERITA
        |
        v
verifica dell'hash nel DB
        |
        v
cookie cifrato nel browser
        |
        v
richieste autenticate al backend
```

Nel database resta l'**hash della password**, non la password. Nel browser resta il **cookie cifrato**, non un token
leggibile da JavaScript. I dati finanziari continuano a usare l'ID numerico storico dell'utente.


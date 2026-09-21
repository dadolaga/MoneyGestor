# Decisioni architetturali approvate

Stato: le decisioni DEC-01..10 sono state approvate dal proprietario il **20 settembre 2026**. Non sono più gate
aperti: costituiscono vincoli per l'implementazione. Qualsiasi modifica successiva deve aggiornare questa pagina, la
roadmap, il contratto API e le schede di fase interessate.

## Matrice

| ID | Decisione approvata | Conseguenze principali |
|---|---|---|
| DEC-01 | ownership singola ora; condivisione futura esplicita | owner derivato dall'identità, nessun owner in input |
| DEC-02 | ASP.NET Core Identity, cookie HttpOnly e provider esterni estendibili | niente token nel JavaScript; antiforgery sulle mutazioni |
| DEC-03 | nuova API formale `/api/v1`; API attuale trattata come legacy | DTO nuovi, OpenAPI, Problem Details e migrazione per slice |
| DEC-04 | EUR, `decimal`/`DECIMAL(19,2)`, due decimali | input oltre scala rifiutato; niente rounding implicito |
| DEC-05 | saldi negativi ammessi | niente controllo fondi insufficienti; trasferimenti comunque rigorosi |
| DEC-06 | data civile oggi; eventuale istante come estensione futura | `DateOnly`/`DATE`/`YYYY-MM-DD` |
| DEC-07 | una istanza backend, MySQL self-hosted esterno, bootstrap da zero | migration prima del serving; nessun container MySQL |
| DEC-08 | import/export completamente bloccato per ora | CLI fail-closed; BAK-41..43 sospesi |
| DEC-09 | anomalia dati = eccezione e stop | report tecnico sicuro, nessuna correzione automatica |
| DEC-10 | registrazione pubblica con verifica email | Identity, anti-abuso, recupero account e anti-enumeration |

## DEC-01 — ownership singola, condivisione futura

**Stato:** approvata il 20 settembre 2026.

Ogni wallet, colore personale, tipo personale e movimento appartiene a un solo utente. L'owner viene sempre derivato
dall'identità autenticata e non è accettato nei DTO di input. Per i nuovi movimenti vale
`UserId == UserInsertId`; le letture e le mutazioni applicano la stessa policy di ownership.

La condivisione sarà una funzionalità futura, non una reinterpretazione dei due campi esistenti. Quando verrà aperta
richiederà un modello esplicito di household/membership, ruoli, inviti, autorizzazioni, audit e migration dedicata. Il
codice corrente non deve anticiparla con bypass, owner opzionali o ACL implicite.

## DEC-02 — Identity, cookie sicuro e provider esterni

**Stato:** approvata il 20 settembre 2026.

La nuova autenticazione usa **ASP.NET Core Identity** per account locali, password, token di verifica/recupero, lockout
e collegamenti a login esterni. Per il browser la sessione usa un cookie cifrato `HttpOnly`, `Secure` in produzione e
`SameSite=Lax` nella topologia same-site. Il frontend usa richieste credentialed e non legge né conserva credenziali o
token di sessione nel JavaScript.

Le richieste che modificano stato devono avere protezione antiforgery con token/header dedicato. CORS consente solo le
origini configurate e le credenziali necessarie; in produzione frontend e API dovrebbero essere pubblicati dietro lo
stesso reverse proxy e nello stesso site. Non si introduce un BFF finché non emerge un requisito cross-site o
multi-client che lo giustifichi.

Google e altri provider potranno essere aggiunti tramite i provider esterni di Identity/OpenID Connect senza cambiare
il modello di sessione. Gli account locali restano supportati; i collegamenti esterni sono entità esplicite e non si
basano sul solo confronto non verificato dell'email. JWT non è il default per il browser.

Gli utenti esistenti vanno migrati con un password hasher compatibile col formato legacy e rehash al primo login
valido. Le sessioni legacy possono essere invalidate una volta con comunicazione e test del rientro. Il token grezzo è
accettabile soltanto sugli endpoint legacy durante la finestra strettamente necessaria alla migrazione e non entra mai
nella nuova `/api/v1`.

## DEC-03 — nuova API `/api/v1`

**Stato:** approvata il 20 settembre 2026.

Si crea una nuova API formale e versionata sotto `/api/v1`. Gli endpoint oggi non versionati diventano il **contratto
legacy**: ricevono solo fix di sicurezza e adapter indispensabili, non nuove funzionalità. Restano disponibili finché
il frontend è migrato per slice e vengono rimossi dopo ricerca dei consumer e una finestra di compatibilità misurata.

La nuova API adotta:

- controller o endpoint group sottili, use case applicativi e policy di dominio condivise;
- DTO separati dalle entità EF, validazione server-side e niente over-posting;
- risposte di successo HTTP standard con JSON tipizzato (`200`, `201`, `204`);
- errori `application/problem+json` conformi a Problem Details, con `code` stabile, `traceId` e field errors;
- autenticazione cookie Identity, antiforgery, rate limiting e autorizzazione deny-by-default;
- OpenAPI riproducibile e contract test come gate di compatibilità.

L'envelope `{ code, message, data }` resta soltanto nel contratto legacy. La logica di dominio non viene duplicata fra
legacy e `/api/v1`: adapter distinti delegano agli stessi use case.

## DEC-04 — precisione monetaria

**Stato:** approvata il 20 settembre 2026.

- unica valuta corrente: EUR;
- `decimal` in .NET e `DECIMAL(19,2)` in MySQL;
- massimo due decimali nei request DTO;
- valori con scala maggiore o fuori range vengono rifiutati, non arrotondati silenziosamente;
- rounding consentito solo in un'operazione di dominio esplicita, con modalità e test dichiarati;
- JSON numerico e neutrale, mai una stringa localizzata.

Valute multiple o strumenti con precisione diversa richiederanno in futuro un modello monetario versionato; non vanno
anticipati ampliando indiscriminatamente la scala.

## DEC-05 — saldi negativi e trasferimenti

**Stato:** approvata il 20 settembre 2026.

Saldo iniziale e saldo corrente possono essere negativi per ogni wallet. Un movimento non viene rifiutato perché porta
il saldo sotto zero; la UI potrà rappresentare meglio questa condizione in una fase futura. Il flag generico `force`
non deve essere esposto e non serve per bypassare il controllo del saldo.

I trasferimenti mantengono invarianti rigorose: importo di input positivo, wallet sorgente e destinazione distinti,
stesso owner, tipo globale `Transfer`, coppia atomica collegata e somma netta zero. Un adjustment è un caso d'uso
esplicito e auditabile, non un bypass generico di ownership o consistenza.

## DEC-06 — data del movimento oggi, ora futura

**Stato:** approvata il 20 settembre 2026.

Per ora un movimento rappresenta una data civile: JSON `YYYY-MM-DD`, .NET `DateOnly`, MySQL `DATE`. I filtri per data
sono inclusivi e non dipendono dal fuso. Sessioni, audit e log usano timestamp UTC.

Se verrà richiesta anche l'ora, sarà un'estensione additiva: la data di business rimarrà disponibile e verrà aggiunto
un campo opzionale, ad esempio `occurredAt`, modellato come istante UTC (`DateTimeOffset` e `DATETIME(6)`) con regole
esplicite per fuso/offset originale. Non si espone ora un campo fittizio e non si deduce un istante dalle mezzanotti
legacy.

## DEC-07 — topologia e configurazione operativa

**Stato:** approvata il 20 settembre 2026.

- una sola istanza backend;
- MySQL self-hosted ed esterno al deployment applicativo;
- supporto iniziale obiettivo: MySQL 8.4 LTS, da confermare con la matrice del provider EF scelta;
- il programma deve poter inizializzare un database assente da zero tramite migration EF versionate e seed idempotente;
- un bootstrap applicativo, prima di accettare traffico, crea il database se manca e applica le migration quando
  esplicitamente abilitato dalla configurazione; errori o anomalie fermano l'avvio;
- backup/preflight restano obbligatori per migration distruttive o database esistenti;
- il deployment può usare container per il backend C# (e gli altri componenti applicativi già previsti), ma non deve
  aggiungere un servizio/container MySQL a Compose;
- TLS termina sul reverse proxy o sull'host secondo ambiente, con cookie `Secure` in produzione.

La policy di logging è interamente configurabile da file: livelli per categoria, sink console/file, directory, naming,
rolling, limite dimensione, retention e opzioni diagnostiche. I default sono sicuri; dati sensibili restano vietati
anche quando aumenta il livello. I segreti continuano a provenire da environment/secret store, non dal file versionato.

## DEC-08 — import/export bloccato

**Stato:** approvata il 20 settembre 2026.

La funzionalità CLI di import/export è completamente disabilitata finché il proprietario non apre una nuova decisione
di prodotto. Il blocco deve essere fail-closed e avvenire prima di leggere settings, aprire MySQL o toccare file di
backup. Il servizio CLI non deve essere avviabile da Compose o da procedure di release.

Il codice può essere mantenuto temporaneamente come riferimento, chiaramente non supportato e non raggiungibile. Non si
investe ora nel formato, nello staging o nei recovery drill: BAK-41..43 sono bloccati per decisione di prodotto. Una
riapertura dovrà prima definire se si tratta di backup/restore, portabilità dati o strumento di sviluppo.

## DEC-09 — anomalie dati: eccezione e stop

**Stato:** approvata il 20 settembre 2026.

Prima di ogni migration rilevante si esegue un preflight read-only. Se vengono trovati owner incoerenti, trasferimenti
orfani, saldi non riconciliati, valori non rappresentabili, duplicati o date fuori range, l'operazione si ferma e
presenta un'eccezione di dominio/migrazione con report azionabile.

Il report include classe dell'anomalia, conteggio e identificatori tecnici necessari, senza PII, segreti o payload
finanziari superflui. Non sono consentite correzioni, arrotondamenti, cancellazioni, riassegnazioni o quarantene
automatiche. Un operatore corregge esplicitamente i dati e rilancia l'operazione.

## DEC-10 — registrazione pubblica verificata

**Stato:** approvata il 20 settembre 2026.

La registrazione self-service resta pubblica. Viene implementata con ASP.NET Core Identity e comprende:

- normalizzazione e unicità server-side di username/email;
- policy password e limiti di dimensione configurati e testati;
- verifica della proprietà dell'email prima dell'attivazione completa;
- token di verifica e password reset a durata limitata e monouso;
- rate limit e lockout per registrazione, login, reinvio verifica e recupero;
- risposte anti-enumeration per login, registrazione e recupero;
- provider email astratto e configurabile; in produzione l'avvio o la feature fallisce chiaramente se il sender
  richiesto non è configurato;
- audit sicuro degli eventi, senza password, token o indirizzi completi nei log.

CAPTCHA e MFA non vengono introdotti senza un requisito dedicato, ma Identity e il modello dati non devono impedirli.

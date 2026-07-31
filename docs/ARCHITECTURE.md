# Architettura di CardScanner

## Obiettivo architetturale

Fornire una PWA mobile installabile e utilizzabile senza distribuzione tramite store, elaborando le fotografie soltanto in memoria e mantenendo sul dispositivo la bozza della sessione.

L'applicazione deve essere pubblicata tramite HTTPS, necessario per l'accesso affidabile alla fotocamera e per il service worker.

## Client

- Angular con supporto PWA e service worker.
- Safari su iPhone/iPad e Chrome su Android come browser supportati nell'MVP.
- IndexedDB per la Sessione conservata recuperabile.
- Preprocessing prospettico in un Web Worker WebAssembly/self-hosted e Tesseract.js in worker, senza bloccare l'interfaccia.
- Fotografie elaborate esclusivamente in memoria e rilasciate dopo OCR e generazione dei candidati.
- Generazione del CSV interamente sul dispositivo.
- Una sola Sessione conservata, In corso o Terminata, con sessione e Registrazioni in tabelle IndexedDB separate.
- Snapshot dei dati Scryfall in ogni Registrazione e nessuna coda persistente delle Scansioni in sospeso.

## Servizi

Il primo incremento è frontend-only: non include backend, account, database remoto o chiavi segrete. Angular interroga direttamente Scryfall. Un eventuale proxy stateless verrà valutato soltanto per cataloghi futuri che richiedano credenziali o non consentano richieste dal browser.

## Indice locale dei nomi Magic

Prima di ogni build, `scripts/generate-name-index.mjs` legge i metadati `/bulk-data`, scarica `all_cards` in una directory temporanea e analizza l'array JSON in streaming. Conserva esclusivamente carte `paper` in italiano o inglese, raggruppa per `oracle_id` (con ID Scryfall come fallback), deduplica e ordina identità e alias, quindi sostituisce atomicamente `public/catalogs/magic/name-index.v1.json`. Download, schema, indice vuoto o validazione non riusciti interrompono il deploy. Il bulk temporaneo viene sempre eliminato e non entra nel repository o nell'output.

Il service worker mantiene l'indice in un gruppo `lazy` con aggiornamento `prefetch`, senza aggiungerlo al bundle iniziale. Il browser non lo copia in IndexedDB. Un Web Worker lo carica una sola volta e costruisce lookup esatto e trigrammi. Se caricamento o validazione falliscono, l'adattatore usa la ricerca live Scryfall; un risultato locale non riconosciuto non attiva il fallback.

## Pipeline di riconoscimento

1. La fotocamera acquisisce l'intero frame e traduce la guida nelle coordinate reali del video.
2. Il worker prova più soglie di bordo, seleziona un quadrilatero convesso plausibile e rifiuta lo scatto quando i bordi non sono affidabili.
3. I quattro angoli vengono ordinati e la carta rettificata a `900 × 1257`; soltanto il titolo viene ritagliato rispetto alla carta canonica.
4. Per la fascia del titolo vengono sempre prodotte scala di grigi, contrasto locale, Otsu e soglia adattiva con polarità normalizzata.
5. Tesseract.js usa `SINGLE_LINE` sul titolo. Ogni osservazione conserva testo, confidenza, variante e nome proposto.
6. Il worker confronta tutte le varianti del nome proposto con l'indice locale: una corrispondenza forte e univoca identifica direttamente la carta, mentre risultati ambigui producono al massimo cinque identità plausibili.
7. Risolta l'identità, l'adattatore rende consultabili tutte le sue stampe fisiche mediante paginazione e filtri per lingua o edizione; la lingua del nome verificato, quando disponibile, inizializza il filtro senza vincolarlo. L'ordinamento usa lingua, data di uscita decrescente, codice dell'edizione e numero da collezione, senza preselezione.
8. Le query limitano i risultati al gioco cartaceo, includono promo e varianti speciali ed escludono le versioni esclusivamente digitali; token ed emblemi restano identità distinte.
9. L'adattatore indicizza anche i nomi delle singole facce e li riconduce all'identità completa; il modello di catalogo espone tutte le immagini disponibili per le stampe multifaccia.
7. La Conferma crea una Registrazione; frame, geometria, bitmap e varianti vengono rilasciati e non entrano in IndexedDB.

## Cataloghi previsti

- Magic: Scryfall
- Pokémon: Pokémon TCG API
- Yu-Gi-Oh!: YGOPRODeck
- Digimon: DigimonCard.io
- One Piece: OPTCG API da selezionare e validare prima dell'integrazione

Ogni catalogo è isolato dietro un adattatore che restituisce il modello universale definito dalla specifica CSV. Il primo incremento implementa soltanto Magic con Scryfall.

Il contratto comune tra riconoscimento e adattatori usa il nome proposto come unico indizio obbligatorio. Gli adattatori possono introdurre indizi specifici del gioco soltanto come ottimizzazioni facoltative e devono sempre consentire la scelta manuale della stampa a partire dal nome.

La ricerca manuale conserva la sintassi testuale offerta dal catalogo. L'adattatore distingue una stampa risolta direttamente da un'identità di carta e, in quest'ultimo caso, riusa la stessa consultazione paginata delle stampe usata dal riconoscimento.

## Decisioni correlate

- [ADR 0001 — PWA web invece di applicazioni native](./adr/0001-pwa-web-invece-di-app-native.md)

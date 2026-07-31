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

## Pipeline di riconoscimento

1. La fotocamera acquisisce l'intero frame e traduce la guida nelle coordinate reali del video.
2. Il worker prova più soglie di bordo, seleziona un quadrilatero convesso plausibile e rifiuta lo scatto quando i bordi non sono affidabili.
3. I quattro angoli vengono ordinati e la carta rettificata a `900 × 1257`; titolo e dati di stampa sono ritagli relativi alla carta canonica.
4. Per entrambe le regioni vengono sempre prodotte scala di grigi, contrasto locale, Otsu e soglia adattiva con polarità normalizzata.
5. Tesseract.js usa `SINGLE_LINE` sul titolo e `SPARSE_TEXT` sui dati inferiori. Ogni osservazione conserva testo, confidenza, variante e indizi.
6. L'adattatore deduplica le coppie set/numero compatibili e i titoli, interroga Scryfall e aggrega tutte le evidenze nel ranking.
7. La Conferma crea una Registrazione; frame, geometria, bitmap e varianti vengono rilasciati e non entrano in IndexedDB.

## Cataloghi previsti

- Magic: Scryfall
- Pokémon: Pokémon TCG API
- Yu-Gi-Oh!: YGOPRODeck
- Digimon: DigimonCard.io
- One Piece: OPTCG API da selezionare e validare prima dell'integrazione

Ogni catalogo è isolato dietro un adattatore che restituisce il modello universale definito dalla specifica CSV. Il primo incremento implementa soltanto Magic con Scryfall.

## Decisioni correlate

- [ADR 0001 — PWA web invece di applicazioni native](./adr/0001-pwa-web-invece-di-app-native.md)

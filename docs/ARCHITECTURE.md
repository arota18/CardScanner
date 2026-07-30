# Architettura di CardScanner

## Obiettivo architetturale

Fornire una PWA mobile installabile e utilizzabile senza distribuzione tramite store, elaborando le fotografie soltanto in memoria e mantenendo sul dispositivo la bozza della sessione.

L'applicazione deve essere pubblicata tramite HTTPS, necessario per l'accesso affidabile alla fotocamera e per il service worker.

## Client

- Angular con supporto PWA e service worker.
- Safari su iPhone/iPad e Chrome su Android come browser supportati nell'MVP.
- IndexedDB per la Sessione conservata recuperabile.
- Tesseract.js eseguito in un Web Worker per non bloccare l'interfaccia durante l'OCR.
- Fotografie elaborate esclusivamente in memoria e rilasciate dopo OCR e generazione dei candidati.
- Generazione del CSV interamente sul dispositivo.
- Una sola Sessione conservata, In corso o Terminata, con sessione e Registrazioni in tabelle IndexedDB separate.
- Snapshot dei dati Scryfall in ogni Registrazione e nessuna coda persistente delle Scansioni in sospeso.

## Servizi

Il primo incremento è frontend-only: non include backend, account, database remoto o chiavi segrete. Angular interroga direttamente Scryfall. Un eventuale proxy stateless verrà valutato soltanto per cataloghi futuri che richiedano credenziali o non consentano richieste dal browser.

## Pipeline di riconoscimento

1. La fotocamera acquisisce manualmente il fronte entro una guida.
2. Il client controlla luminosità e sfocatura e, per Magic, ritaglia separatamente la fascia del titolo e quella dei dati di stampa.
3. Tesseract.js analizza localmente entrambe le regioni, escludendo illustrazione e resto della carta.
4. Un parser specifico del Gioco selezionato individua il possibile titolo, il codice dell'espansione e il numero da collezione.
5. Un adattatore interroga il catalogo online del gioco.
6. Un motore di ranking verifica gli indizi OCR, distingue corrispondenze forti e deboli e presenta al massimo cinque candidati.
7. La Conferma crea una Registrazione di carta; la fotografia viene eliminata.

## Cataloghi previsti

- Magic: Scryfall
- Pokémon: Pokémon TCG API
- Yu-Gi-Oh!: YGOPRODeck
- Digimon: DigimonCard.io
- One Piece: OPTCG API da selezionare e validare prima dell'integrazione

Ogni catalogo è isolato dietro un adattatore che restituisce il modello universale definito dalla specifica CSV. Il primo incremento implementa soltanto Magic con Scryfall.

## Decisioni correlate

- [ADR 0001 — PWA web invece di applicazioni native](./adr/0001-pwa-web-invece-di-app-native.md)

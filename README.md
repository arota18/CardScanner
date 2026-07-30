# CardScanner

PWA Angular 22 mobile-first per registrare carte Magic tramite fotocamera/OCR locale o ricerca Scryfall, revisionare una sessione conservata in IndexedDB ed esportarla in CSV universale.

## Sviluppo

Richiede Node 24 LTS e npm. L'ambiente di sviluppo locale è considerato sicuro dai browser per la fotocamera.

```bash
npm ci
npm start
```

Test e build:

```bash
npm test -- --watch=false
npm run build
```

Gli asset Tesseract (worker, WASM e modelli `ita`/`eng`) sono self-hosted sotto `public/ocr`; nessun frame viene persistito.

## Hosting statico HTTPS

Pubblicare il contenuto di `dist/card-scanner/browser` su un host statico HTTPS. Tutte le route devono ricadere su `index.html`; `_redirects` copre i provider che adottano quel formato, mentre sugli altri va configurata la regola equivalente. Non impostare cache immutabile su `index.html`, `ngsw.json` o `ngsw-worker.js`; gli asset con hash possono invece essere immutabili.

La fotocamera e il service worker richiedono un contesto sicuro. Dopo una nuova versione, Angular Service Worker scarica gli asset aggiornati e li attiva al successivo caricamento stabile.

## Limiti MVP

Solo Magic: The Gathering è abilitato. Non sono presenti backend, account, telemetria, storico, import CSV o coda persistente delle scansioni non risolte. L'avvio di una nuova sessione sostituisce l'unica sessione conservata solo dopo conferma.

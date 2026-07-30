# Flussi utente

## Avvio e recupero

All'apertura, CardScanner propone di riprendere la Sessione conservata quando presente. In assenza di bozza, l'operatore avvia una sessione scegliendo gioco, Condizione e Finitura predefinite e, facoltativamente, la Posizione di magazzino. L'installazione della PWA è suggerita ma non obbligatoria.

## Scansione principale

1. L'operatore inquadra il fronte della carta verticalmente entro la guida e scatta manualmente.
2. L'app segnala uno scatto troppo scuro o sfocato.
3. L'operatore usa la fotografia oppure la ripete.
4. L'OCR locale analizza separatamente la fascia del titolo e quella dei dati di stampa.
5. Il catalogo verifica gli indizi OCR e restituisce i candidati; soltanto una corrispondenza forte viene evidenziata.
6. L'operatore sceglie un candidato, verifica gli attributi e conferma.
7. La Registrazione di carta viene salvata nella bozza; la fotografia viene eliminata.
8. L'app mostra brevemente l'aggiunta e torna alla fotocamera.

## Mancato riconoscimento

Se il testo non è verificabile, l'app comunica “Testo non riconosciuto” invece di presentare l'assenza di candidati come un successo OCR. Mostra separatamente il testo estratto dal titolo e dai dati inferiori, senza conservare la fotografia, e propone nell'ordine Riprova foto, Cerca manualmente e Salta carta. La ricerca manuale non viene precompilata con testo OCR non verificato. L'MVP non conserva una coda di Scansioni in sospeso. Senza rete o catalogo non è consentita una registrazione libera; la sessione conservata resta consultabile ed esportabile.

## Revisione

Durante la sessione, l'operatore può modificare stampa, Lingua, Finitura, Condizione e Posizione di magazzino oppure eliminare una registrazione. Dalla fotocamera può annullare l'ultima aggiunta. Le modifiche non cambiano `Scanned at`.

## Chiusura ed esportazione

Terminare la sessione congela le registrazioni e mostra il riepilogo. Dopo la risoluzione o esclusione esplicita degli elementi incompleti, l'operatore scarica il CSV. La bozza terminata resta disponibile per ripetere il download e viene eliminata soltanto quando l'operatore conferma una nuova sessione.

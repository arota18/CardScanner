# Flussi utente

## Avvio e recupero

All'apertura, CardScanner propone di riprendere la Sessione conservata quando presente. In assenza di bozza, l'operatore avvia una sessione scegliendo gioco, Condizione e Finitura predefinite e, facoltativamente, la Posizione di magazzino. L'installazione della PWA è suggerita ma non obbligatoria.

## Scansione principale

1. L'operatore inquadra il fronte della carta verticalmente entro la guida e scatta manualmente.
2. L'app segnala uno scatto troppo scuro o sfocato.
3. L'operatore usa la fotografia oppure la ripete.
4. L'OCR locale analizza soltanto la fascia del titolo.
5. Il catalogo verifica il nome proposto: con una sola corrispondenza forte apre direttamente le stampe, mentre con un risultato ambiguo chiede prima all'operatore di scegliere l'identità della carta.
   Per una carta multifaccia è sufficiente il nome di una qualsiasi faccia e l'identità risultante comprende l'intera carta.
6. Il catalogo rende disponibili tutte le stampe fisiche dell'identità scelta, incluse le varianti speciali ma non quelle esclusivamente digitali, in un elenco paginato e filtrabile per lingua o edizione; quando il nome verificato ne determina la lingua, questa viene applicata come filtro iniziale modificabile. Le stampe più recenti vengono mostrate per prime e nessuna è preselezionata.
7. L'operatore sceglie una stampa, verifica gli attributi e conferma.
8. La Registrazione di carta viene salvata nella bozza; la fotografia viene eliminata.
9. L'app mostra brevemente l'aggiunta e torna alla fotocamera.

## Mancato riconoscimento

Se il testo non è verificabile, l'app comunica “Testo non riconosciuto” invece di presentare l'assenza di candidati come un successo OCR. Mostra il testo estratto dal titolo, senza conservare la fotografia, e propone nell'ordine Riprova foto, Cerca manualmente e Salta carta. La ricerca manuale non viene precompilata con testo OCR non verificato. L'MVP non conserva una coda di Scansioni in sospeso. Senza rete o catalogo non è consentita una registrazione libera; la sessione conservata resta consultabile ed esportabile.

## Ricerca di catalogo manuale

L'operatore può cercare con testo libero, inclusi nome, edizione e numero da collezione. Se la query identifica direttamente una stampa, l'app la presenta per la Conferma; se identifica soltanto la carta, l'operatore passa allo stesso elenco completo e filtrabile di stampe usato dopo una Scansione. Nessun risultato viene registrato senza Conferma.

## Revisione

Durante la sessione, l'operatore può modificare stampa, Lingua, Finitura, Condizione e Posizione di magazzino oppure eliminare una registrazione. Dalla fotocamera può annullare l'ultima aggiunta. Le modifiche non cambiano `Scanned at`.

## Chiusura ed esportazione

Terminare la sessione congela le registrazioni e mostra il riepilogo. Dopo la risoluzione o esclusione esplicita degli elementi incompleti, l'operatore scarica il CSV. La bozza terminata resta disponibile per ripetere il download e viene eliminata soltanto quando l'operatore conferma una nuova sessione.

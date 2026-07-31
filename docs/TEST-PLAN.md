# Piano di collaudo MVP

## Dispositivi

- Safari sulle ultime due versioni principali di iOS/iPadOS.
- Chrome sulle ultime due versioni principali di Android.
- Almeno un dispositivo di fascia media per le misure prestazionali.

## Riconoscimento Magic

- Test automatici verificano le coordinate delle regioni di titolo e dati di stampa, la loro normalizzazione, l'interpretazione dei campi e il rifiuto di testo non verificato.
- Un risultato OCR come `if`, privo di riscontro forte nel catalogo, non viene trattato come identificazione riuscita né precompila la ricerca manuale.
- In caso di fallimento sono visibili il testo delle due regioni e, nell'ordine, Riprova foto, Cerca manualmente e Salta carta.
- Prima del collaudo fotografico completo, una prova manuale su dispositivo con una carta “Island” verifica che il titolo non venga ricavato dall'illustrazione.
- Dataset di almeno 200 carte reali con edizioni, lingue italiana e inglese, finiture, layout e condizioni differenti.
- Gli scatti troppo scuri, sfocati o illeggibili vengono respinti.
- Nel 90% o più delle fotografie utilizzabili, la stampa corretta appare tra i primi cinque candidati.
- Si registrano separatamente rilevamento, nuovi scatti richiesti, falsi candidati forti, durata di ogni fase e picco di memoria; 8 secondi è una metrica comparativa, non un criterio di rifiuto.
- Dopo 15 secondi sono disponibili annullamento, ripetizione, ricerca manuale e salto; si prova l'annullamento durante preprocessing, OCR e catalogo.
- Fixture includono carta inclinata, decentrata, parzialmente fuori guida, sfondo complesso, sleeve, riflessi e prospettiva marcata. Scene senza carta devono essere rifiutate.
- Test unitari coprono angoli, omografia, ritagli canonici, quadrilateri, quattro varianti e aggregazione senza unire set/numero incompatibili.
- Il benchmark usa almeno 200 scansioni e richiede la stampa corretta nei primi cinque per almeno il 90% delle immagini utilizzabili, oltre a un risultato superiore alla pipeline precedente.
- Una sequenza di almeno 20 scansioni sul più debole iPhone supportato non deve mostrare crash o crescita progressiva della memoria.

## Bozza e resilienza

- Ogni conferma, modifica ed eliminazione viene recuperata dopo ricarica o riavvio, compatibilmente con le garanzie del browser.
- Un errore IndexedDB viene mostrato senza fingere che il salvataggio sia riuscito.
- L'app non persiste fotografie e non le invia in rete.
- Senza rete o Scryfall, consultazione, modifica ed esportazione continuano a funzionare.
- Una sessione terminata resta riesportabile fino alla conferma di una nuova sessione.

## Carico e CSV

- Riepilogo, modifica, salvataggio ed esportazione restano utilizzabili con almeno 1.000 registrazioni.
- Ogni carta confermata produce una riga; scansioni saltate o sospese non ne producono.
- Intestazioni, ordine e valori rispettano `CSV-SPEC.md`.
- Virgole, virgolette, ritorni a capo, accenti e caratteri non latini mantengono il valore originale.
- Il file usa UTF-8 con BOM, virgola e terminatori `CRLF`.
- Un file da 1.000 righe si apre in Excel, LibreOffice e Google Sheets.
- Esportazioni ripetute della sessione terminata mantengono gli stessi dati.

## Accessibilità

- I flussi non dipendenti dalla fotocamera sono verificati rispetto a WCAG 2.2 AA.
- Controlli touch, contrasto, focus, screen reader, ingrandimento e messaggi non basati solo sul colore sono inclusi nei test.
- La ricerca manuale permette di operare senza fotocamera.

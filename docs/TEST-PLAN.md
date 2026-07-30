# Piano di collaudo MVP

## Dispositivi

- Safari sulle ultime due versioni principali di iOS/iPadOS.
- Chrome sulle ultime due versioni principali di Android.
- Almeno un dispositivo di fascia media per le misure prestazionali.

## Riconoscimento Magic

- Dataset di almeno 200 carte reali con edizioni, lingue italiana e inglese, finiture, layout e condizioni differenti.
- Gli scatti troppo scuri, sfocati o illeggibili vengono respinti.
- Nel 90% o più delle fotografie utilizzabili, la stampa corretta appare tra i primi cinque candidati.
- Nel 95% dei casi con rete stabile, i candidati appaiono entro 8 secondi da "Usa foto".
- Dopo 15 secondi sono disponibili ripetizione, ricerca manuale e salto.

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

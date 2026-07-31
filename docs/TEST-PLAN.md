# Piano di collaudo MVP

## Dispositivi

- Safari sulle ultime due versioni principali di iOS/iPadOS.
- Chrome sulle ultime due versioni principali di Android.
- Almeno un dispositivo di fascia media per le misure prestazionali.

## Riconoscimento Magic

- Una fixture `all_cards` con italiano, inglese, duplicati, digitale, token e multifaccia verifica filtri, alias delle facce, deduplicazione, ordinamento e metadati; bulk troncato, schema inatteso e indice vuoto devono fallire.
- Il matcher copre exact match univoco e omonimo, accenti, lingua, nomi corti, confusioni OCR, `Titano Soiare → Titano Solare`, accordo tra varianti, margine insufficiente e limite di cinque candidati.
- Indice assente, HTTP fallito e schema invalido attivano il fallback live; un risultato valido ma non riconosciuto non lo attiva.

- Test automatici verificano le coordinate della fascia del titolo, la sua normalizzazione, l'interpretazione del nome e il rifiuto di testo non verificato.
- Un risultato OCR come `if`, privo di riscontro forte nel catalogo, non viene trattato come identificazione riuscita né precompila la ricerca manuale.
- Una corrispondenza forte e univoca apre direttamente le stampe; nomi ambigui mostrano prima identità distinte e non mescolano le rispettive stampe.
- Un titolo italiano o inglese applica inizialmente la lingua corrispondente alle stampe; il filtro resta modificabile e rimovibile, mentre un nome senza lingua determinabile non imposta filtri.
- Le stampe rispettano l'ordinamento per lingua, data di uscita decrescente, codice dell'edizione e numero da collezione; nessuna risulta preselezionata.
- I risultati includono versioni fisiche normali, promo e speciali, escludono quelle esclusivamente digitali e non mescolano token o emblemi con le carte che li generano.
- Fixture bifronte e split verificano che il nome di ogni faccia risolva la stessa identità completa e che tutte le immagini della stampa siano consultabili.
- In caso di fallimento è visibile il testo estratto dal titolo e, nell'ordine, Riprova foto, Cerca manualmente e Salta carta.
- Prima del collaudo fotografico completo, una prova manuale su dispositivo con una carta “Island” verifica che il titolo non venga ricavato dall'illustrazione.
- Dataset di almeno 200 carte reali con edizioni, lingue italiana e inglese, finiture, layout e condizioni differenti.
- Gli scatti troppo scuri, sfocati o illeggibili vengono respinti.
- Nel 90% o più delle fotografie utilizzabili, il nome corretto viene verificato dal catalogo e tutte le relative stampe fisiche sono raggiungibili nell'elenco paginato.
- Si registrano separatamente rilevamento, nuovi scatti richiesti, falsi candidati forti, durata di ogni fase e picco di memoria; 8 secondi è una metrica comparativa, non un criterio di rifiuto.
- Dopo 15 secondi sono disponibili annullamento, ripetizione, ricerca manuale e salto; si prova l'annullamento durante preprocessing, OCR e catalogo.
- Fixture includono carta inclinata, decentrata, parzialmente fuori guida, sfondo complesso, sleeve, riflessi e prospettiva marcata. Scene senza carta devono essere rifiutate.
- Test unitari coprono angoli, omografia, ritaglio canonico del titolo, quadrilateri, quattro varianti, verifica del nome e paginazione delle stampe.
- Il benchmark usa almeno 200 scansioni e richiede la verifica del nome corretto per almeno il 90% delle immagini utilizzabili, oltre alla disponibilità di tutte le relative stampe e a un risultato superiore alla pipeline precedente.
- Una sequenza di almeno 20 scansioni sul più debole iPhone supportato non deve mostrare crash o crescita progressiva della memoria.
- La build verifica che l'indice non entri nel bundle iniziale e sia nel gruppo lazy del service worker; il collaudo su iPhone e Android include “Titano Solare”.

## Contratto degli adattatori

- Ogni adattatore di gioco accetta il nome proposto come unico indizio obbligatorio e consente di raggiungere la scelta manuale della stampa senza codice dell'edizione o numero da collezione.
- Eventuali indizi aggiuntivi specifici del gioco migliorano soltanto ordinamento o filtri e la loro assenza non blocca il flusso.
- La ricerca manuale con nome percorre identità → stampe, mentre una query sufficientemente specifica per edizione e numero può risolvere direttamente la stampa; entrambi i casi richiedono Conferma.

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

# Requisiti di CardScanner

## Obiettivo

Realizzare una web app installabile come PWA per acquisire carte collezionabili e produrre l'inventario della sessione corrente in formato CSV universale.

## Giochi previsti

- Magic: The Gathering
- Pokémon
- One Piece Card Game
- Digimon Card Game
- Yu-Gi-Oh!

Lo schema universale e l'interfaccia devono poter rappresentare tutti i giochi previsti. Il primo incremento operativo implementa Magic end-to-end con Scryfall; gli altri giochi vengono aggiunti progressivamente tramite adattatori di catalogo separati, dopo aver validato sul campo la pipeline OCR e Conferma.

## Requisiti confermati per la prima fase

- Scansione e Ricerca di catalogo sono percorsi alternativi e producono entrambi una Identificazione proposta soggetta a Conferma.
- L'MVP conserva una sola Sessione sul dispositivo, In corso o Terminata; “Bozza” indica esclusivamente lo stato modificabile In corso.
- La coda persistente delle Scansioni in sospeso è esclusa dall'MVP.

- L'inventario usa uno schema comune a tutti i giochi e non dipende da ManaBox o da altre applicazioni esterne.
- Ogni copia fisica confermata produce una registrazione distinta, anche quando tutti gli attributi coincidono.
- Il modello e il CSV non contengono il campo Quantità.
- L'eventuale raggruppamento di righe identiche avviene durante un'elaborazione successiva del CSV, fuori da CardScanner.
- Ogni registrazione contiene `Scanned at` in formato ISO 8601 UTC con millisecondi.
- `Scanned at` non è considerato un identificatore univoco; un `Record ID` verrà rivalutato quando saranno introdotte importazione o sincronizzazione.
- Il CSV MVP non contiene prezzo di acquisto, prezzo di mercato o valutazione economica.
- Lo schema e l'ordine delle colonne sono definiti in [CSV-SPEC.md](./CSV-SPEC.md).
- Ogni scansione acquisisce il fronte di una singola carta.
- Lo scatto è manuale e usa una guida rettangolare per l'allineamento del fronte.
- Autofocus e torcia vengono offerti quando il browser e il dispositivo li supportano.
- Prima dell'OCR, l'app segnala fotografie troppo scure o sfocate.
- L'operatore visualizza l'anteprima e sceglie se usare o ripetere lo scatto.
- L'immagine viene ritagliata automaticamente entro la guida; un editor di ritaglio manuale e lo scatto automatico sono fuori dall'MVP.
- L'app usa il Gioco selezionato e propone nome, edizione e numero da collezione; l'operatore conferma o corregge la proposta prima di aggiungerla all'inventario.
- Ogni sessione di scansione riguarda un solo gioco, scelto all'inizio.
- Condizione e finitura hanno valori predefiniti di sessione, modificabili durante la conferma.
- La Finitura viene scelta manualmente durante la Conferma e usa i valori CSV `Normal`, `Foil`, `Holo`, `Reverse Holo`, `Etched`, `Other` o `Unknown`.
- Il catalogo può suggerire la Finitura; il predefinito iniziale della sessione è `Normal`.
- `Printing variant` è distinto dalla Finitura e descrive varianti come artwork alternativo, promo o first edition.
- La Posizione di magazzino è opzionale e viene mantenuta tra una scansione e la successiva.
- La Posizione di magazzino è un unico testo libero con lunghezza massima di 250 caratteri.
- L'operatore può cambiare la Posizione di magazzino durante la sessione; il nuovo valore si applica alle scansioni successive e non modifica retroattivamente le voci già confermate.
- La condizione è scelta manualmente tra Mint, Near Mint, Excellent, Good, Light Played, Played e Poor.
- Ogni Registrazione di carta conserva la lingua della copia fisica; viene proposta quando disponibile, può assumere il valore `Unknown` ed è correggibile manualmente.
- La PWA è installabile e può essere aperta senza rete.
- L'intero flusso MVP funziona anche senza installare la PWA; il suggerimento di installazione è facoltativo e non bloccante.
- La stessa applicazione web deve funzionare direttamente nei browser supportati, senza richiedere la distribuzione tramite Google Play o Apple App Store.
- La matrice supportata nella prima fase è limitata a Safari su iPhone/iPad e Chrome su Android, nelle ultime due versioni principali disponibili al momento del rilascio.
- Browser desktop, Firefox e altri browser mobili non rientrano nel collaudo della prima fase.
- L'interfaccia MVP è in italiano; i testi devono essere separati dal codice per consentire future localizzazioni.
- Intestazioni e valori controllati del CSV restano in inglese e non dipendono dalla lingua dell'interfaccia.
- Il client MVP è sviluppato in Angular con supporto PWA.
- La Sessione conservata usa IndexedDB e l'OCR viene eseguito in un Web Worker per mantenere reattiva l'interfaccia.
- Il primo incremento Magic è frontend-only e interroga Scryfall direttamente, senza backend, account, database remoto o chiavi applicative.
- Consultazione, modifica ed esportazione CSV dei dati già acquisiti funzionano offline.
- Il riconoscimento di nuove scansioni richiede una connessione di rete.
- Se la rete o il catalogo non sono disponibili, la sessione conservata esistente resta consultabile, modificabile ed esportabile, ma scansione e ricerca nel catalogo vengono sospese.
- L'MVP non consente registrazioni completamente libere e prive di `Catalog source` o `Catalog ID`.
- Al ripristino del servizio l'operatore può riprendere la sessione senza perdere le Registrazioni già confermate.
- La pipeline Magic ritaglia separatamente la fascia superiore del titolo e la fascia inferiore dei dati di stampa; l'illustrazione e il resto della carta non vengono inviati all'OCR.
- Il primo incremento richiede che la carta sia verticale e allineata alla guida; correzione automatica di inclinazione e prospettiva resta fuori dall'MVP.
- L'OCR elabora entrambe le regioni prima di interrogare il catalogo e mantiene caricato il motore tra scansioni successive; l'accuratezza ha priorità sulla risposta anticipata.
- Il riconoscimento fotografico dell'MVP accetta carte Magic in italiano e inglese nella stessa sessione, senza una Lingua predefinita di sessione.
- La pipeline estrae il possibile titolo, il codice dell'espansione e il numero da collezione e interroga il catalogo online del Gioco selezionato.
- L'app presenta uno o più candidati ordinati per compatibilità; nessun candidato entra nell'inventario senza Conferma.
- Il riconoscimento mostra al massimo cinque candidati con immagine di riferimento, nome, edizione, numero da collezione e variante.
- Un testo OCR non verificato non viene trattato come nome valido né usato per precompilare la Ricerca di catalogo.
- Una corrispondenza è forte quando titolo OCR e titolo di catalogo coincidono o sono molto simili, oppure quando coincidono codice dell'espansione e numero da collezione.
- Con una corrispondenza debole nessun candidato è preselezionato; una corrispondenza forte può essere evidenziata ma richiede comunque una Conferma esplicita.
- Quando il riconoscimento fallisce, l'app mostra separatamente il testo estratto dalle due regioni senza conservare la fotografia.
- Se non esiste un candidato soddisfacente, la ricerca manuale nel catalogo è disponibile soltanto su richiesta dell'operatore.
- L'operatore può rimandare una Scansione non risolta e passare immediatamente alla carta successiva.
- Una Scansione rimandata non modifica l'Inventario di sessione né il CSV.
- Dopo la Conferma, l'app mostra brevemente la carta aggiunta, quindi ritorna automaticamente alla fotocamera.
- Il riepilogo dell'Inventario di sessione resta accessibile tramite un comando separato durante la scansione.
- Prima della chiusura della sessione, l'operatore può modificare la stampa selezionata, lingua, finitura, condizione e Posizione di magazzino di una Registrazione di carta.
- Prima della chiusura della sessione, l'operatore può eliminare una Registrazione di carta previa conferma.
- Dalla schermata fotocamera è disponibile l'annullamento rapido dell'ultima aggiunta.
- Una modifica non altera il valore originale di `Scanned at`.
- Le fotografie non vengono inviate a servizi cloud nella prima fase.
- Le fotografie vengono elaborate soltanto in memoria e non vengono mai scritte nella Sessione conservata o in altro archivio locale.
- Dopo l'estrazione OCR e la produzione dei candidati, l'immagine viene eliminata; per le Scansioni rimandate si possono conservare soltanto testo OCR e metadati dei candidati.
- Un servizio visivo come Gemini potrà essere valutato successivamente come fallback se i test dimostrano che l'OCR locale non è sufficientemente accurato.
- Nella prima fase non sono previsti account, sincronizzazione con un server o inventario cumulativo.
- Il CSV contiene soltanto le carte confermate nella sessione corrente.
- La sessione corrente viene salvata localmente come bozza e può essere recuperata dopo una ricarica, una chiusura accidentale o un riavvio del dispositivo.
- Il recupero della bozza è best effort: l'app richiede storage persistente quando supportato, salva dopo ogni modifica e segnala eventuali errori, ma non può impedire al browser di rimuovere i dati del sito.
- La bozza non costituisce uno storico e viene conservata anche dopo la chiusura della sessione, fino all'avvio confermato di quella successiva.
- Terminare una sessione mostra il riepilogo e richiede la risoluzione delle voci incomplete prima di generare il CSV.
- Una sessione terminata è congelata ma la sua sessione conservata resta disponibile, così il CSV può essere scaricato nuovamente.
- La bozza viene eliminata soltanto quando l'operatore conferma l'avvio di una nuova sessione.

## Requisiti non funzionali

- Salvataggio della bozza, riepilogo, modifica ed esportazione devono restare utilizzabili con almeno 1.000 Registrazioni di carta nella stessa sessione.
- La soglia di 1.000 registrazioni è un obiettivo minimo di collaudo, non un limite applicativo esplicito.
- Dal comando "Usa foto", i candidati devono comparire entro 8 secondi nel 95% dei casi su un dispositivo mobile di fascia media con connessione stabile.
- Durante il riconoscimento l'interfaccia mostra le fasi di ritaglio, lettura e ricerca.
- Dopo 15 secondi senza risultato l'operatore può riprovare, aprire la ricerca manuale oppure saltare la carta.
- Il collaudo del riconoscimento Magic usa almeno 200 carte reali con varietà di edizioni, lingue, finiture, layout e condizioni.
- Per almeno il 90% delle fotografie giudicate utilizzabili, la stampa corretta deve comparire tra i cinque candidati.
- Fotografie scure, sfocate o illeggibili devono essere rifiutate dal controllo qualità e non conteggiate come identificazioni errate.
- L'interfaccia e i flussi non dipendenti dalla fotocamera devono rispettare WCAG 2.2 livello AA.
- Controlli touch, contrasto, focus, etichette per tecnologie assistive, ingrandimento e messaggi non basati soltanto sul colore rientrano nel collaudo.
- La ricerca manuale nel catalogo costituisce l'alternativa alla scansione fotografica.
- L'MVP non include analytics, telemetria o invio automatico di errori.
- Eventuali dettagli diagnostici sono mostrati localmente, copiabili su iniziativa dell'operatore e non contengono fotografie o dati dell'inventario.
- L'applicazione è accessibile pubblicamente senza autenticazione nell'MVP.
- Il riconoscimento OCR di Magic viene collaudato per carte in italiano e inglese; le altre lingue possono essere selezionate dal catalogo ma non hanno garanzia di riconoscimento fotografico nell'MVP.

## Mappa dell'interfaccia

1. **Home** — avvio di una nuova sessione o ripresa della bozza.
2. **Impostazione sessione** — scelta di gioco, Condizione, Finitura e Posizione di magazzino predefinite.
3. **Fotocamera** — guida di inquadratura, torcia, scatto e annullamento dell'ultima aggiunta.
4. **Anteprima** — uso o ripetizione della fotografia.
5. **Candidati** — fino a cinque risultati, ricerca manuale o salto.
6. **Conferma carta** — stampa, Lingua, Finitura, Condizione e Posizione di magazzino.
7. **Inventario di sessione** — elenco, modifica ed eliminazione.
8. **Riepilogo finale** — validazione, download CSV e avvio di una nuova sessione.

## Fuori ambito nella prima fase

- Importazione del CSV universale per ripristinare o continuare un inventario; prevista per una seconda fase.
- Persistenza dell'inventario e storico delle sessioni; da valutare in una seconda fase.
- Autenticazione e limitazione dell'accesso al personale autorizzato; da valutare in una seconda fase.

## Requisiti differibili

- Una futura coda "Da risolvere" potrà conservare testo OCR e candidati, mai immagini; non fa parte dell'MVP.

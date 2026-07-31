# Inventario di carte collezionabili

Questo contesto descrive l'acquisizione di carte collezionabili appartenenti a giochi diversi e la produzione di un inventario di sessione portabile per il magazzino.

## Linguaggio

**Inventario di sessione**:
L'insieme delle carte confermate durante una singola Sessione di scansione, descritte con uno schema comune a tutti i giochi supportati.
_Evitare_: inventario cumulativo, collezione, catalogo

**CSV universale**:
La rappresentazione scaricabile dell'Inventario di sessione con campi comuni ai giochi supportati e senza dipendenze da applicazioni esterne.
_Evitare_: CSV ManaBox, esportazione ManaBox

**Registrazione di carta**:
La registrazione di una singola copia fisica confermata, mantenuta distinta da tutte le altre copie anche quando gli attributi coincidono.
_Evitare_: gruppo, quantità, duplicato

**Istante di registrazione**:
La data e ora UTC con millisecondi in cui una Registrazione di carta viene confermata.
_Evitare_: identificativo univoco

**Scansione**:
L'acquisizione del fronte di una singola carta tramite fotocamera.
_Evitare_: fotografia, inserimento

**Ricerca di catalogo**:
Il percorso manuale alternativo alla Scansione che individua un'identità o una stampa tramite testo libero.
_Evitare_: registrazione libera

**Nome proposto**:
Il nome della carta estratto dal titolo visibile in una Scansione e non ancora verificato dal catalogo.
_Evitare_: stampa riconosciuta, nome definitivo

**Indice locale dei nomi**:
Asset versionato per schema, derivato durante il deploy dal bulk Scryfall e contenente soltanto identità e alias italiani/inglesi delle carte cartacee. Non è un catalogo di stampe e non viene conservato in IndexedDB.
_Evitare_: bulk locale, catalogo offline

**Identità candidata**:
Una possibile identità di carta compatibile con un Nome proposto che il catalogo non riesce a verificare in modo univoco.
_Evitare_: stampa, edizione, versione

**Carta candidata**:
Una stampa fisica del catalogo appartenente alla carta compatibile con il Nome proposto e presentata all'operatore.
_Evitare_: carta confermata, riconoscimento definitivo

**Identificazione proposta**:
La stampa di catalogo scelta dall'operatore, completa di nome, edizione e numero da collezione, ma non ancora confermata.
_Evitare_: carta riconosciuta, risultato definitivo

**Scansione in sospeso**:
Una Scansione priva di Conferma che conserva soltanto testo OCR e candidati mentre l'operatore continua ad acquisire altre carte.
_Evitare_: carta aggiunta, errore bloccante

**Conferma**:
L'accettazione o correzione da parte dell'operatore di un'Identificazione proposta prima del suo ingresso nell'Inventario di sessione.
_Evitare_: salvataggio automatico

**Sessione di scansione**:
Una sequenza di Scansioni riferite a un solo gioco collezionabile scelto dall'operatore.
_Evitare_: inventario, sessione multi-gioco

**Sessione conservata**:
L'unica Sessione mantenuta sul dispositivo, nello stato In corso o Terminata.
_Evitare_: storico, inventario persistente

**Bozza di sessione**:
Una Sessione conservata In corso e quindi ancora modificabile.
_Evitare_: sessione terminata, storico

**Sessione terminata**:
Una Sessione di scansione congelata, validata e disponibile per l'esportazione, la cui Sessione conservata resta recuperabile fino all'avvio di una nuova sessione.
_Evitare_: sessione eliminata

**Gioco selezionato**:
Uno tra Magic, Pokémon, One Piece, Digimon e Yu-Gi-Oh! assegnato a tutte le Scansioni di una Sessione di scansione.
_Evitare_: gioco riconosciuto automaticamente

**Condizione**:
La valutazione manuale dello stato fisico di una carta secondo la scala Mint, Near Mint, Excellent, Good, Light Played, Played o Poor.
_Evitare_: condizione riconosciuta, qualità

**Finitura**:
La caratteristica fisica di superficie di una copia, normalizzata come Normal, Foil, Holo, Reverse Holo, Etched, Other o Unknown.
_Evitare_: qualità, condizione

**Predefinito di sessione**:
Il valore di Condizione, Finitura o Posizione di magazzino proposto per ogni nuova Scansione e modificabile dall'operatore.
_Evitare_: valore obbligatorio

**Posizione di magazzino**:
Il riferimento testuale opzionale, lungo al massimo 250 caratteri, al luogo fisico in cui viene riposta una Registrazione di carta.
_Evitare_: indirizzo, posizione della fotocamera

**Lingua**:
La lingua della copia fisica, oppure Sconosciuta quando non è determinabile.
_Evitare_: lingua dell'interfaccia

**Lingua proposta**:
La lingua ricavata dal nome verificato e usata soltanto come filtro iniziale delle Carte candidate.
_Evitare_: Lingua confermata, lingua obbligatoria

## Relazioni

- Un **Inventario di sessione** viene rappresentato da un **CSV universale**
- Un **Inventario di sessione** contiene zero o più **Registrazioni di carta**
- Ogni **Registrazione di carta** produce esattamente una riga del **CSV universale**
- Ogni **Registrazione di carta** ha esattamente un **Istante di registrazione**
- Una **Scansione** riguarda esattamente una carta e produce zero o un **Nome proposto**
- Il **Nome proposto** è l'unico indizio di riconoscimento richiesto a tutti i Giochi selezionati
- Un **Nome proposto** con un'unica corrispondenza forte identifica direttamente la carta
- Un **Nome proposto** ambiguo produce più **Identità candidate**, tra le quali l'operatore sceglie la carta
- Una carta identificata rende disponibili tutte le **Carte candidate** fisiche che le appartengono
- Il nome verificato di una faccia identifica l'intera carta multifaccia e non una Registrazione separata della singola faccia
- La scelta di una **Carta candidata** produce una **Identificazione proposta**
- Una **Ricerca di catalogo** che identifica soltanto la carta rende disponibili le stesse **Carte candidate** di una Scansione
- Una **Ricerca di catalogo** che identifica direttamente una stampa produce la relativa **Identificazione proposta**
- Una **Identificazione proposta** richiede esattamente una **Conferma**
- Solo una **Identificazione proposta** confermata può creare una **Registrazione di carta** nell'Inventario di sessione
- Una **Scansione in sospeso** non crea alcuna **Registrazione di carta**
- Una **Sessione di scansione** ha esattamente un **Gioco selezionato** e contiene zero o più **Scansioni**
- Una **Sessione di scansione** produce esattamente un **Inventario di sessione**
- Una **Sessione di scansione** non terminata ha al massimo una **Sessione conservata**
- Una **Sessione terminata** non accetta nuove Scansioni e può produrre nuovamente il proprio CSV universale
- L'avvio di una nuova **Sessione di scansione** elimina la Sessione conservata terminata solo dopo la conferma dell'operatore
- Una **Registrazione di carta** può essere modificata o eliminata finché la Sessione di scansione non è terminata
- La modifica di una **Registrazione di carta** non cambia il suo **Istante di registrazione**
- Ogni copia confermata ha esattamente una **Condizione**, scelta dall'operatore durante la Conferma
- Una **Sessione di scansione** ha un **Predefinito di sessione** per Condizione e uno per Finitura
- Una Conferma può sostituire i **Predefiniti di sessione** per la singola carta
- Sostituire Condizione o Finitura non cambia i Predefiniti di sessione
- Una **Sessione di scansione** può avere un **Predefinito di sessione** per la Posizione di magazzino
- La Posizione cambia per le carte successive soltanto scegliendo “Usa per le prossime carte”
- Ogni copia confermata ha esattamente una **Lingua**
- Un nome verificato in una lingua può produrre zero o una **Lingua proposta**
- La **Lingua proposta** filtra inizialmente le **Carte candidate**, ma l'operatore può modificarla o rimuoverla
- La **Lingua** della Registrazione di carta deriva dalla Carta candidata scelta e resta correggibile durante la Conferma
- Ogni copia confermata appartiene sempre a una **Registrazione di carta** distinta

## Dialogo di esempio

> **Dev:** "Il file deve essere importabile direttamente in ManaBox?"
> **Esperto di dominio:** "No, il **CSV universale** serve a trasferire al magazzino l'**Inventario di sessione** con uno schema comune."
>
> **Dev:** "Tre copie identiche generano tre righe?"
> **Esperto di dominio:** "Sì, generano tre **Registrazioni di carta** distinte; l'eventuale raggruppamento avviene dopo l'esportazione."
>
> **Dev:** "Una carta riconosciuta entra subito nell'inventario?"
> **Esperto di dominio:** "No, l'operatore deve prima dare la **Conferma** all'**Identificazione proposta**."
>
> **Dev:** "La **Scansione** riconosce anche edizione e numero da collezione?"
> **Esperto di dominio:** "No, estrae soltanto un **Nome proposto**; l'operatore sceglie poi la stampa tra le **Carte candidate** del catalogo."
>
> **Dev:** "Se il **Nome proposto** corrisponde a più carte, mescoliamo tutte le loro stampe?"
> **Esperto di dominio:** "No, l'operatore sceglie prima un'**Identità candidata** e solo dopo consulta le sue **Carte candidate**."
>
> **Dev:** "Il titolo italiano rende definitiva la **Lingua** della copia?"
> **Esperto di dominio:** "No, produce una **Lingua proposta** che filtra inizialmente le stampe e può essere cambiata o rimossa."
>
> **Dev:** "Una faccia di una carta bifronte è una carta distinta?"
> **Esperto di dominio:** "No, il suo nome identifica l'intera carta multifaccia e le **Carte candidate** mostrano tutte le facce disponibili."
>
> **Dev:** "Il riconoscimento deve capire se la carta è Pokémon o Magic?"
> **Esperto di dominio:** "No, tutte le **Scansioni** usano il **Gioco selezionato** all'inizio della **Sessione di scansione**."
>
> **Dev:** "Possiamo dedurre la **Condizione** dalla foto frontale?"
> **Esperto di dominio:** "No, la sceglie l'operatore durante la **Conferma**."
>
> **Dev:** "Due copie identiche nella stessa posizione possono essere accorpate?"
> **Esperto di dominio:** "No, ogni copia fisica rimane una **Registrazione di carta** distinta nel **CSV universale**."

## Ambiguità segnalate

- Inizialmente il CSV di esempio suggeriva un'esportazione specifica per Magic e ManaBox; risolto: il formato sarà universale e multi-gioco.
- "Inventario di magazzino" poteva indicare uno storico cumulativo nell'app; risolto: la prima fase produce soltanto l'**Inventario di sessione** e non conserva uno storico.
- "Persistenza" poteva indicare sia uno storico sia il recupero del lavoro corrente; risolto: la prima fase conserva soltanto una **Sessione conservata**.
- La proposta iniziale per le Scansioni in sospeso prevedeva di conservare la fotografia; risolto: nessuna immagine persiste, neppure nella **Sessione conservata**.
- Inizialmente le copie identiche venivano aggregate in una Voce con Quantità; risolto: ogni copia produce una **Registrazione di carta** e l'aggregazione è esterna a CardScanner.
- La coda delle Scansioni in sospeso è esplicitamente esclusa dall'MVP.
- "Riconoscimento della carta" poteva indicare anche il riconoscimento automatico della stampa; risolto: la **Scansione** estrae soltanto il **Nome proposto**, mentre l'operatore sceglie la stampa dal catalogo.
- Gli indizi OCR specifici di un gioco potevano essere considerati obbligatori; risolto: soltanto il **Nome proposto** appartiene al flusso comune, mentre altri indizi restano ottimizzazioni facoltative degli adattatori.
- "Candidato" poteva indicare sia un possibile nome sia una stampa fisica; risolto: **Identità candidata** indica il possibile nome, **Carta candidata** indica la stampa.
- La lingua ricavata dal titolo poteva essere confusa con la **Lingua** confermata; risolto: è soltanto una **Lingua proposta** usata come filtro iniziale.
- La Ricerca di catalogo poteva costituire un flusso separato per le stampe; risolto: accetta testo libero ma converge sul percorso identità → stampe quando non individua già una stampa precisa.

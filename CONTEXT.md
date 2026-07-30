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
Il percorso manuale alternativo alla Scansione che individua una stampa senza fotocamera.
_Evitare_: registrazione libera

**Identificazione proposta**:
Il riconoscimento non ancora verificato di gioco, nome, edizione e numero da collezione prodotto da una Scansione o Ricerca di catalogo.
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

## Relazioni

- Un **Inventario di sessione** viene rappresentato da un **CSV universale**
- Un **Inventario di sessione** contiene zero o più **Registrazioni di carta**
- Ogni **Registrazione di carta** produce esattamente una riga del **CSV universale**
- Ogni **Registrazione di carta** ha esattamente un **Istante di registrazione**
- Una **Scansione** riguarda esattamente una carta e produce zero o una **Identificazione proposta**
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

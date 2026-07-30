# Specifica del CSV universale

Il file rappresenta esclusivamente le Registrazioni di carta confermate nella sessione corrente. Ogni copia fisica occupa una riga distinta; non esiste una colonna Quantità e CardScanner non aggrega le righe.

## Colonne

| Colonna | Obbligatoria | Contenuto |
|---|---:|---|
| `Game` | sì | Gioco selezionato per la sessione |
| `Card name` | sì | Nome della carta restituito dal catalogo e confermato dall'operatore |
| `Set code` | no | Codice dell'edizione nel catalogo |
| `Set name` | no | Nome dell'edizione nel catalogo |
| `Collector number` | sì | Numero o codice da collezione stampato sulla carta |
| `Rarity` | no | Rarità dichiarata dal catalogo |
| `Printing variant` | no | Variante della stampa, per esempio artwork alternativo, promo o first edition |
| `Finish` | sì | `Normal`, `Foil`, `Holo`, `Reverse Holo`, `Etched`, `Other` o `Unknown` |
| `Language` | sì | Lingua della copia fisica oppure `Unknown` |
| `Condition` | sì | `Mint`, `Near Mint`, `Excellent`, `Good`, `Light Played`, `Played` o `Poor` |
| `Storage location` | no | Testo libero, massimo 250 caratteri, che descrive la posizione fisica nel magazzino |
| `Catalog source` | sì | Catalogo dal quale proviene l'identificazione |
| `Catalog ID` | sì | Identificativo della stampa nel catalogo indicato |
| `Scanned at` | sì | Istante di registrazione (Conferma) in formato ISO 8601 UTC con millisecondi |

## Regole

- L'ordine delle colonne è stabile e coincide con la tabella.
- Il separatore di campo è la virgola (`,`).
- Il file usa UTF-8 con BOM.
- I record terminano con `CRLF`.
- Un campo che contiene virgole, virgolette o ritorni a capo viene racchiuso tra virgolette doppie; ogni virgoletta doppia interna viene duplicata, secondo RFC 4180.
- Il nome segue il formato `cardscanner-{game}-{data-ora}.csv`.
- I campi non applicabili o non disponibili sono vuoti, eccetto `Language`, che usa `Unknown`.
- `Scanned at` non garantisce l'unicità della riga.
- Prezzi e quantità non fanno parte dello schema MVP.
- Un'elaborazione esterna può aggregare le righe ignorando `Scanned at` e scegliendo esplicitamente quali altri campi usare come chiave.

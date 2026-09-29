# Editor schemi con orientamento Scout

## Obiettivo
Mostrare nell’editor di ricezione, attacco e difesa lo stesso orientamento usato nello Scout live, così la posizione salvata coincide visivamente con quella mostrata durante la partita.

## Modifiche
- Ruotare la visualizzazione dell’editor da rete orizzontale in alto a rete verticale.
- Posizionare la rete sul lato interno corretto: a sinistra per la squadra mostrata nella metà destra, a destra per quella nella metà sinistra.
- Convertire coordinate e trascinamento soltanto nella visualizzazione, mantenendo invariato il formato dei dati già salvati e la compatibilità dei template esistenti.
- Adeguare linea dei 3 metri, griglia e diciture al nuovo verso.
- Aggiungere controlli automatici sulla conversione tra coordinate dell’editor e coordinate dello Scout.

## Verifica
- Confrontare la stessa rotazione e lo stesso schema nell’editor e nello Scout per entrambe le squadre.
- Verificare trascinamento, salvataggio e riapertura di un template.
- Eseguire i test del campo e controllare la schermata su desktop.

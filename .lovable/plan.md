# Lato campo per partita

## Obiettivo
Aggiungere nel pre-partita la scelta **Casa a sinistra** oppure **Casa a destra**. La scelta vale per la partita corrente e viene ricordata insieme alla partita salvata.

## Modifiche
- Aggiungere il lato della squadra di casa ai dati della partita, con **Casa a destra** come valore predefinito per mantenere il comportamento attuale.
- Inserire nel pre-partita un selettore chiaro con anteprima testuale dell'ordine delle squadre.
- Usare questa scelta nello Scout Live su desktop e mobile, orientando insieme giocatori, zone, battuta, frecce e schemi.
- Evitare che la vecchia preferenza generale “Inverti lati campo” sovrascriva la scelta della partita.
- Aggiornare demo, ripristino e salvataggio locale affinché il lato resti coerente.

## Verifica
- Test automatici per valore predefinito e persistenza.
- Controllo visivo di entrambe le configurazioni: Casa sinistra e Casa destra.
- Verifica che P1 e il battitore restino nella posizione corretta dopo il cambio lato.

# Roadmap analisi DVW

Obiettivo: implementare i blocchi 1-5 del brief (escluso il 6 "integrazione app"). Lavoro grosso, va diviso in fasi spedibili e verificabili una alla volta.

## Fase 1 — KPI avanzati per giocatore
File: `src/lib/scoutAnalysis.ts`, `src/components/analysis/PlayersTab.tsx`
- Aggiungere calcolo per ogni giocatore di:
  - Attack efficiency separata K1 (side-out) vs K2 (break point).
  - Attack% per zona di alzata (1/2/3/4/6/pipe) e per tempo (1°, 2°, super, fast, pipe).
  - Expected points su ricezione: somma pesata (R#=1.0 / R+=0.8 / R!=0.5 / R/=0.2 / R==0) / n ricezioni.
  - Serve pressure index: % ricezioni avversarie ≤ R! sulle proprie battute.
- UI: nuovi sotto-tab dentro PlayersTab ("Attacco K1/K2", "Per zona/tempo", "Ricezione+", "Battuta+").

## Fase 2 — Pattern e tendenze
Nuovo file: `src/lib/scoutPatterns.ts`, nuovo tab `src/components/analysis/PatternsTab.tsx`
- Distribuzione palleggiatore avversario condizionata a (rotazione, zona alzatore, qualità ricezione). Tabella + heatmap.
- Heatmap di battuta avversaria → ricevitore nostro, con esito medio (asse colore = R-rating medio).
- Catene perdenti: estrarre sequenze di 3+ azioni che terminano in break dell'avversario, aggregare per pattern ricorrenti (es. `Q-low-serve → R= → no-attack`).

## Fase 3 — Scouting pre-partita
Nuovo tab `src/components/analysis/PreMatchTab.tsx`
- Confronto rotazione per rotazione (P1…P6) side-out% delle due squadre, tabella affiancata + bar chart.
- Top 3 combinazioni preferite per ogni alzatore avversario (riutilizzare `attackCombos.ts`), con suggerimento muro (banale: la zona attaccata più spesso).
- Per ogni giocatore avversario: confronto tendenze in K1 vs K2 (zona attacco preferita, tempo preferito).

## Fase 4 — Comparativi temporali
Estendere `src/pages/MatchAnalysisMulti.tsx` o nuovo `TrendsTab.tsx`
- Trend ultime N partite per giocatore selezionato: efficienza attacco, % positiva ricezione, ace/error ratio.
- Delta set-by-set dentro la stessa partita: tabella per giocatore con valore per set 1..5 e variazione vs media.

## Fase 5 — UX e workflow
File coinvolti: `src/pages/MatchAnalysis.tsx`, tutti i tab in `src/components/analysis/`
- Filtro globale "rotazione" (Select 1-6 + "tutte") che si propaga a tutti i tab via context o prop.
- Drill-down: click su KPI → Dialog con elenco azioni che lo compongono + mini-replay sul `VolleyballCourt` esistente.
- Export PDF report pre-partita: estendere `pdfReport.ts` con sezione che impagina i contenuti delle fasi 2-3.
- Confronto multi-partita stabilizzato (riusare MatchAnalysisMulti): caricare più DVW della stessa squadra, mostrare medie ± deviazione.

## Ordine di consegna proposto

1. **Fase 1** (KPI avanzati) — base, sblocca tutto il resto.
2. **Fase 5 filtro rotazione + drill-down** — UX trasversale, meglio prima di moltiplicare i tab.
3. **Fase 2** (pattern).
4. **Fase 3** (pre-partita).
5. **Fase 4** (trend temporali).
6. **Fase 5 PDF + multi-partita** — chiusura.

## Note tecniche

- Tutto il calcolo va in `src/lib/`, mai dentro i componenti.
- Riutilizzare i tipi esistenti in `src/components/analysis/types.ts` e `scoutAnalysis.ts`; aggiungere nuovi tipi accanto, non rimpiazzare.
- Niente nuove dipendenze npm: bastano i grafici già usati (recharts) e `VolleyballCourt` per heatmap.
- Ogni fase chiude con: build verde, tsgo verde, screenshot del nuovo tab.

## Domanda prima di partire

Procedo nell'ordine sopra **una fase per volta** (consegno e aspetto feedback), oppure preferisci che spari **tutto insieme in una mega-PR**? La prima è molto più sicura, la seconda più veloce ma con rischio regressioni alto sui tab esistenti.

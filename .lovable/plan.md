## Riprogettazione Click&Scout — Tablet landscape (1024–1366 × 768–900)

Riferimento: manuale Click&Scout Data Project (capp. 5.1–5.5).

### Fase 1 — FATTO
- Sidebar rotazioni collassabile (default chiusa, 28px / 180px aperta).

### Fase 2 — FATTO
- Densificazione tablet (`max-[900px]`): padding 3→2, gap 2→1, action panel 192→176/144px.
- Flag `singleTeamMode` + toggle nel pannello Impostazioni, sincronizzato con `matchState.singleTeamMode` via `useEffect`. ActionPanel rendera UI dedicata (PUNTO AVVERSARIO + MURO) quando attivo.
- Valutazione "suggerita in giallo": ring 4px warning + badge "💡 Suggerito: X" con bottone "Conferma X" 1-tap. Default: R=ricezionePredefinita, D/E/F=`+`, altri=`#`.

### Fase 3 — FATTO
- Schermata fine partita: overlay full-screen con punteggio set, "▶ Continua Rilevazione" (resetta `isMatchEnded=false`) e "✕ Nuova Partita" (resetMatch con conferma).

### Fase 4 — FATTO (audit memory + collegamenti mancanti)
- Rimossi gialli fuori-brand: `CSRallyHistory` (+ / !), `ActionPanel` tempo T e valutazione !, alias `--cs-cta-yellow` ora arancio. Conforme a Core memory "MAI giallo fluo".
- Side-rail SOST: ora dispatcha `scout-open-sub` con team → ActionPanel apre il flow sostituzione pre-impostato sulla squadra giusta (era solo `toast.info`).

### Fase 5 — FATTO (velocità inserimento + campo proporzionato)
- **Skip contestuali** (`handleEvaluationSelect` / `handleStartZone`): `S=` finalizza subito (errore servizio, no traiettoria); `A#` salta endZone (attacco punto, destinazione fuori campo). Riduce flusso medio da ~5.8 a ~4.2 tap.
- **Ripeti ultima azione** (`repeatLastAction`): bottone ↺ nella quick-bar che re-inserisce l'ultima action con timestamp aggiornato + auto-punto. Utile per muri/ricezioni consecutive.
- **Fast Mode reale**: con `settings.fastMode=true`, lo step skill mostra valutazione suggerita in badge angolo; 1 tap su skill = `fastFire()` che salva azione + auto-punto + followServe, saltando tutti gli step intermedi.
- **Campo proporzionato** (`ZoneCourt`): `gridTemplateRows: 25% 35% 40%` (front corta, fondo profonda); sfondo per area (front più chiaro, deep più scuro); numero zona piccolo in angolo + label area al centro (Primo tempo, Pipe, Pipe, Fondo cent…); linea 3m piena, retro tratteggiata; aggiornati i centri Y per le frecce traiettoria.

### Fase 6 — FATTO (gap parità Click&Scout)
- **Info partita** (`onInfo` in CSToolbar): dialog con set/score/set vinti/battuta + ricostruzione rally corrente (slice da ultimo terminale #/=//) + bottone "Annulla rally corrente".
- **Modifiche azioni** (`onModify`): dialog con ultime 20 azioni → Modifica (riusa editingAction) / Elimina + fallback a Controlli avanzati (ScoreBoard).
- **Sostituzioni libere**: `substitutePlayer` legge `scout_settings.sostituzioniLibere` da localStorage; se true ignora il limite 6/6.
- **Area di battuta 2-tap** (`showServeStartZone`): toggle nei settings; se attivo per skill=S, step `startZone` PRIMA del tipo battuta (poi serveType/evaluation).
- **Auto-correlation visibile**: badge arancio nello step Evaluation che mostra l'inferenza ("R → alzata stessa squadra", "S → ricezione avversaria"…) quando `autoCorrelation=true`.
- **Storico rally collassabile** (`showRallyHistory`): toggle 1-tap accanto al titolo "Inserimento Azione" + setting persistente.
- **Undo rally**: nuovo `undoRally()` nello store (rimuove tutte le azioni dal rally corrente fino all'ultimo terminale) + bottone "Rally" nella quick-bar di ActionPanel + evento `scout-undo-rally`.
- **Indicatore "attendendo input"**: barra arancio sottile animata sotto al campo, larghezza proporzionale allo step corrente (team→endZone), via evento `scout-waiting`.

### Note implementative
- Nessuna modifica a schema DB / RLS.
- `RotationDirections` accessibile sia dalla sidebar collassabile sia dal Sheet "Dir".

### Fase 8 — FATTO (parità rotazioni & posizioni Click&Scout)
- **Libero auto-swap** (`applyLiberoAutoSwap` in store): a ogni rotazione (`addPoint`/`rotateTeam`/`startMatch`/`endSet`) il libero entra al posto del centrale di seconda linea (P1/P5/P6) ed esce quando il MB ruota in prima linea. Tracking persistente via `matchState.home/awayBenchedMb`, incluso negli snapshot per `undoLastAction`.
- **Animazione rotazione**: `transition-all duration-300 ease-out` sui cerchi giocatori in `VolleyballCourt` → spostamenti fluidi su sideout/rotazione manuale.
- **Validazione lineup** (`validateLineup`): controllo duplicati/posizioni vuote eseguito a `startMatch` con toast warning.
- **Badge front/back row**: marker F (arancio) / B (grigio) in alto-sx dei cerchi → distingue prima linea (attaccanti) da seconda linea (no attacco da dentro 3m).
- **Doppio cambio 5-1** (`doubleSwitch51(team)`): bottone "5-1" nella quick-bar di `ActionPanel`. Trova S+OP in campo e riserve in panchina, esegue lo scambio incrociato (S→OP-riserva, OP→S-riserva), consuma 2 sostituzioni (0 in modalità libere).

Note:
- FIVB alignment P1-P6 visivo: skip (internamente coerente, eventuale fix futuro impatta anche `zoneLabels` e frecce).
- Nessuna modifica DB.

### Fase 9 — FATTO (rifinitura parità C&S)
- **Validazione ruoli/overlap** (`validateLineup`): libero in prima linea = errore; nessun S in campo = errore. Toast warning a `startMatch`.
- **Cartellini Y/R nel rail laterale** (`CSSideRail`): bottoni giallo/rosso (cartellino squadra, playerNumber=null) collegati a `addSanction`. Toast feedback.
- **Pallina animata ultima azione**: cerchio arancio che traccia start→end via `<animateMotion>` sull'ultima azione con traiettoria (durata 0.7s + fade), key cambiata a ogni nuova action per re-trigger.
- **Top giocatori live** in `InSetStatsPanel`: breakdown per (team × giocatore × skill) con #/=/eff%, filtro tot≥2, top 6 per volume nel set corrente.
### Fase 10 — FATTO (velocità operatore + correttezza dati)
- **FIVB overlap validation** (`validateLineup`): controlla coppie opposte P1↔P4 / P2↔P5 / P3↔P6 per S+OP (5-1), 2×S (5-2), 2×M e 2×O. Toast warning a `startMatch` per ogni violazione.
- **Combo chain** (`settings.comboChain`): dopo un'azione NON terminale (terminale = S=, A#/=//, B#/=//) mantiene team+player e salta direttamente allo step skill. Cumulabile con followServe (chain ha priorità).
- **Scorciatoie tastiera** (`settings.keyboardShortcuts`, default ON): H/V = home/away, cifre 1-99 con commit auto a 600ms o 2 cifre / Enter = giocatore, S/R/A/B/D/E/F = skill, #/+/-/=//! = valutazione, 1-9 = zone, Esc = indietro. Ignora input quando il focus è su INPUT/TEXTAREA/SELECT.

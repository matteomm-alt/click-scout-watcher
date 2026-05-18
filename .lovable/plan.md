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

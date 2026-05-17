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

### Note implementative
- Nessuna modifica a schema DB / RLS.
- `RotationDirections` accessibile sia dalla sidebar collassabile sia dal Sheet "Dir".

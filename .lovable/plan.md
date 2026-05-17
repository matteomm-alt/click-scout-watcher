## Riprogettazione Click&Scout — Tablet landscape (1024–1366 × 768–900)

Riferimento: manuale Click&Scout Data Project (capp. 5.1–5.5).

### Decisioni utente
- Entrambe le squadre rilevate (single-team in step successivo)
- 2-tap battuta opzionale via setting (default già coperto da `showStartZone`+`showEndZone`)
- Sidebar destra collassabile con i 6 mini-campi rotazioni
- Target primario: tablet orizzontale, desktop fallback

### Fase 1 — FATTO
- Sidebar rotazioni collassabile a destra (default chiusa, 28px / 180px).

### Fase 2/3 — IN CORSO
- FATTO: densificazione tablet (`max-[900px]`): padding root 3→2, gap 2→1, pannello azione 192→176px (desktop) / 144px (tablet basso).
- FATTO: flag `singleTeamMode` + `singleTeamSide` in scoutSettings, toggle in pannello Impostazioni.
- TODO: collegamento del flag al flusso ActionPanel (bottone "Punto" diretto sulla squadra non rilevata).
- TODO: stato visivo "evaluation suggested in giallo" (tap conferma vs override).
- TODO: schermata fine partita con "Continua Rilevazione" (cap. 5.7).

### Note implementative
- Nessuna modifica a `matchStore` / DB / RLS.
- `RotationDirections` resta anche nel Sheet statistiche (tab "Dir").

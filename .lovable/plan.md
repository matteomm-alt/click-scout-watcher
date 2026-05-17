## Riprogettazione Click&Scout — Tablet landscape (1024–1366 × 768–900)

Riferimento: manuale Click&Scout Data Project (capp. 5.1–5.5).

### Decisioni utente
- Entrambe le squadre rilevate (single-team in step successivo)
- 2-tap battuta opzionale via setting (default già coperto da `showStartZone`+`showEndZone`)
- Sidebar destra collassabile con i 6 mini-campi rotazioni
- Target primario: tablet orizzontale, desktop fallback

### Fase 1 — FATTO
- Sidebar rotazioni collassabile a destra del rail ospite (`rotationsOpen`, default chiusa, larghezza 180px aperta / 28px chiusa). Riusa `RotationDirections` esistente.
- Toggle chevron sempre visibile.

### Fase 2 — TODO (prossime iterazioni)
- **ActionPanel contestuale per skill**: ridurre altezza fissa 192px → 72–96px, mostrare SOLO i controlli pertinenti alla skill corrente
  - Battuta: J / F / JF + UNDO grande
  - Ricezione: vuoto (gestita dal tap, valutazione suggerita in giallo)
  - Attacco: MUR 0-1-2 | # + − ! / = | S Q T
  - Muro: # + − ! / =
- **Suggerimento valutazione "in giallo"**: stato visivo `evaluation = suggested | confirmed`. Permette tap conferma vs override.
- **Campo + area battuta visibile**: quando skill=S, mostrare la banda di battuta dietro al servente in modo evidente (la logica `select-start`+`select-end` su `ZoneCourt` c'è già).

### Fase 3 — TODO
- **Modalità "rileva una sola squadra"** (cap. 5.8): nuovo flag in `MatchSetup` → bottone "Punto" sostituisce il tap-per-azione sulla squadra non rilevata.
- **Densificazione finale**: rail laterali da 56 → 48 px, header da 56 → 48 px, toolbar da 40 → 36 px su breakpoint tablet (`@media (max-height: 800px)`).
- **Schermata fine partita** con "Continua Rilevazione" (cap. 5.7).

### Note implementative
- Nessuna modifica a `matchStore` / DB / RLS in Fase 1.
- `RotationDirections` resta anche nel Sheet statistiche (tab "Dir") per non perdere accessibilità.

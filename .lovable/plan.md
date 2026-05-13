# Replica Click&Scout — Piano

## Analisi degli screenshot

### Schermata 1 (maxresdefault) — Stato base, nessun rally in corso
Layout in 5 fasce orizzontali, larghezza fissa, aspetto desktop "windowed":

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: [TEAM A pink] [SCORE A] [SET A-B] [SCORE B] [TEAM B]│  ← bandiera viola/rosa team A, viola team B
├─────────────────────────────────────────────────────────────┤
│ TOOLBAR: [Info] [Modify] [⚙]                  [End Match]  │  ← bottoni blu chiaro a sx, verde a dx
├──┬──────────────────────────────────────────────────┬───────┤
│TO│  Libero in/out         │      Libero in/out      │  TO  │
│  │  [4][19]  ←ext bench   │            [6]   ←ext   │      │
│SU├──────────────────────────────────────────────────┤  SU  │  ← colonne laterali blu strette
│B │   ┌──────────────┬──────────────┐               │  B   │    con label verticale TO/SUB
│  │   │ campo arancio (3×3 zone)    │ pannello SERVE│      │
│  │   │  numeri bianchi grandi      │ (verticale,   │      │
│  │   │  6 sx + 6 dx                │  blu scuro)   │      │
│  │   │  zone divise da linee       │ + "Show Serve │      │
│  │   │  bianche tratteggiate       │  Directions"  │      │
│Pn│   │  S marker piccolo (setter)  │ (giallo)      │ Pnt  │
│t │   └──────────────┴──────────────┘               │      │
├──┴──────────────────────────────────────────────────┴───────┤
│ EXT [J] [F] [JF]  ←tipo battuta              ↻ swap         │
│      jump  float  jump-float                                │
├─────────────────────────────────────────────────────────────┤
│ STORICO RALLY: [LineUp][*SERVE][*01SH-][a14RH+]…[ap01:01]   │
│                tab piccoli, ognuno colore della squadra     │
│                ultimo a destra GRANDE arancio + UNDO rosso  │
└─────────────────────────────────────────────────────────────┘
```
Pannello laterale destro fuori-finestra: lista S1…S6 (rotazioni) con micro-mappa attacchi + "Analysis".

### Schermata 2 (AttaccoMuro) — Rally in corso, lato attacco
- Header identico, palette pink/violet team A, blue team B.
- Toolbar con `Info`/`Modifiche` (italiano) + ingranaggio.
- Pulsanti `TO` `SOST` verticali laterali, ora con badge numerico (1/2 timeout disponibili).
- Campo: pallini colorati per giocatori (rosa team A, blu team B), `P` giallo = libero, contorno giallo = giocatore selezionato.
- Sopra il campo, label nera **ATTACCO** = stato corrente.
- Mani-tutorial (1-5) numerate = legenda gesti, da NON replicare in produzione.
- Sotto il campo:
  - `MUR` 0/1/2 = numero muratori
  - **#  +  −  !  /  =** = valutazione (cambia label sopra: "attacco" / "ricezione" / "battuta")
  - `S Q T` = combo attacco (super/veloce/tesa) lato dx
- Storico rally: tab più larghi, ultimo `Attacco Q+` arancio gigante.
- Colonna destra fuori finestra: P1…P6 + tab squadra A/B in alto.

### Stati derivati
1. **Pannello SERVE** (verticale blu + bottone giallo "Show Serve Directions") → solo per la squadra al servizio. Per la squadra in ricezione il pannello sparisce / lascia spazio a "RICEZIONE".
2. **Label sopra il campo** cambia: ATTACCO / RICEZIONE / BATTUTA / MURO / DIFESA.
3. **Riga valutazioni `# + - ! / =`** + label sotto si adatta allo skill corrente.
4. **Combo dx (S/Q/T) o (J/F/JF)**: jump types per battuta, combo per attacco.

## Mappatura ai nostri componenti

| Click&Scout | Nostro file |
|---|---|
| Header score + team | `ScoreBoard.tsx` |
| Campo + giocatori-pallini | `VolleyballCourt.tsx` |
| Pannello SERVE / azione corrente | `ActionPanel.tsx` (riga valutazioni + combo) |
| Storico rally bottoni | `QuickActions.tsx` |
| Wrapper + colonne TO/SUB | `LiveScout.tsx` |
| Setup → Roster → Lineup | `MatchSetup.tsx` / `RosterManager.tsx` / `LineupSelector.tsx` |

## Implementazione (in ordine)

### 1. Design tokens nuovi (`src/index.css` + `tailwind.config.ts`)
Aggiungo token "click-scout" derivati dal nostro tema:
- `--cs-court`: arancio campo (riusa --primary leggermente desaturato)
- `--cs-frame`: grigio "alluminio" della cornice → in dark = `--card`
- `--cs-team-a`: rosa/magenta (riusa accento brand A)
- `--cs-team-b`: blu (riusa --opponent già esistente)
- `--cs-rail`: blu scuro per pannelli laterali SERVE/TO/SUB
- `--cs-cta`: arancio CTA grande (= --primary)

### 2. `LiveScout.tsx` — nuova griglia desktop
Sostituisco la griglia attuale con layout a 5 righe / 3 colonne:
```
grid-rows: [header 56px] [toolbar 44px] [field 1fr] [ext 56px] [history 64px]
grid-cols: [60px TO/SUB] [1fr campo+serve] [60px TO/SUB]
```
Colonna centrale internamente flex: campo (flex-1) + pannello SERVE 80px (mostrato condizionalmente).

### 3. `ScoreBoard.tsx`
Header full-width: bandiera team A (sfondo gradient pink) | tile bianco score A | tile dark "set A-B" giallo | tile bianco score B | bandiera team B (gradient blue). Bottone close rosso a destra.

### 4. `VolleyballCourt.tsx`
- Sfondo court arancio uniforme (3×3 zone con divisori bianchi tratteggiati).
- Giocatori = cerchi colorati 44px con numero bianco bold.
- Marker `P` giallo piccolo per libero in basso a destra del cerchio.
- Marker `S` lettera nera fuori dal cerchio per setter.
- Cerchio selezionato: ring arancio 3px.
- Prop `compactAspect` già esistente da rivalutare.

### 5. `ActionPanel.tsx`
- Riga valutazioni `# + - ! / =` larga, ognuno tile colorato (nero/giallo/verde/giallo-arancio/rosso/rosso-scuro) con label dinamica sotto (`attacco`/`ricezione`/`battuta`).
- Toggle `MUR 0/1/2` a sinistra.
- Combo `S/Q/T` o `J/F/JF` a destra (cambia in base a skill).
- Pannello laterale `SERVE` verticale gestito qui: visibile solo quando il rally sta per iniziare e `currentServingTeam === activeTeam`.

### 6. `QuickActions.tsx` — storico rally
- Tab piccoli colorati con codice azione (`*01SH-`, `a14RH+`, `*p01:00`).
- Ultima azione tile arancio grande + bottone `UNDO` rosso adiacente.
- Scroll orizzontale.

### 7. Colonne laterali TO / SUB / Punto
Sub-componente `<SideRail side="left|right" />` con label verticale (writing-mode), badge numerico timeout disponibili, click → apre dialog corrispondente.

### 8. `MatchSetup.tsx`, `RosterManager.tsx`, `LineupSelector.tsx`
Restyling coerente: stessa cornice "windowed", header score-style, campo arancio per LineupSelector con drag-drop dei numeri sulle 6 zone.

## Sicurezza / compatibilità
- Nessuna modifica a `matchStore` / logica scout / DB / RLS.
- Solo presentation layer: tutti i componenti restano backwards-compatible verso le funzioni esistenti.
- Mobile: invariato in questo round (solo desktop, come richiesto in scope).

## Verifica finale
1. Build pulito.
2. Screenshot desktop di `/scout` e confronto fianco-a-fianco con `maxresdefault.jpg` + `AttaccoMuro.png`.
3. Test manuale flusso: Setup → Roster → Lineup → primo rally → battuta → ricezione → attacco → punto → undo.
4. Verifica che `Show Serve Directions` appaia solo lato servente.

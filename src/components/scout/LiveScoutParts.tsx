import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Team } from '@/types/volleyball';
import { Button } from '@/components/ui/button';
import { substitutionPartners, pairAllowed } from '@/lib/substitutions';
import { useMatchStore } from '@/store/matchStore';
import { SKILL_LABELS, } from '@/types/volleyball';
import type { ScoutAction, } from '@/types/volleyball';

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

export function ActionLog({ actions }: { actions: ScoutAction[] }) {
  return (
    <>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        Ultime azioni ({actions.length})
      </div>
      <div className="space-y-1">
        {actions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-6">
            Nessuna azione registrata
          </div>
        )}
        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${a.team === 'home' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span className="font-mono text-primary font-bold">#{a.playerNumber}</span>
            <span className="text-muted-foreground">{SKILL_LABELS[a.skill]}</span>
            <span className={`font-bold ${
              a.evaluation === '#' || a.evaluation === '+' ? 'text-accent' :
              a.evaluation === '=' || a.evaluation === '/' ? 'text-destructive' :
              'text-warning'
            }`}>
              {a.evaluation}
            </span>
            {(a.startZone || a.endZone) && (
              <span className="text-primary/60 text-xs font-mono">
                {a.startZone || '?'}→{a.endZone || '?'}
              </span>
            )}
            <span className="text-muted-foreground ml-auto text-xs">{a.timestamp}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function SubstitutionPicker({
  team, setTeam, outNumber, onPickOut, onPickIn,
}: {
  team: 'home' | 'away';
  setTeam: (t: 'home' | 'away') => void;
  outNumber: number | null;
  onPickOut: (n: number) => void;
  onPickIn: (n: number) => void;
}) {
  const { homeTeam, awayTeam, matchState, events } = useMatchStore();
  const teamData = team === 'home' ? homeTeam : awayTeam;
  const partners = substitutionPartners(events, team, matchState.currentSet, teamData.players);
  const lineup = team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup;
  const onCourt = lineup.map((n) => {
    const p = teamData.players.find((pp) => pp.number === n);
    return { number: n, name: p?.lastName || `#${n}`, isLibero: p?.isLibero };
  });
  const benchedMb = team === 'home' ? matchState.homeBenchedMb : matchState.awayBenchedMb;
  const outIsLibero = !!teamData.players.find((p) => p.number === outNumber)?.isLibero;
  const bench = teamData.players
    .filter((p) => !lineup.includes(p.number) && !p.isLibero)
    // il centrale rimpiazzato dal libero non è disponibile come subentrante
    .filter((p) => outIsLibero || p.number !== benchedMb)
    // un giocatore può cambiare con un solo compagno (salvo il libero, che non conta)
    .filter((p) => outIsLibero || outNumber == null || pairAllowed(partners, outNumber, p.number))
    .sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['home', 'away'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTeam(t)}
            className={`min-h-12 flex-1 px-4 rounded text-sm font-bold active:scale-95 ${
              team === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {t === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}
          </button>
        ))}
      </div>
      {!outNumber ? (
        <>
          <p className="text-xs text-muted-foreground">Chi esce?</p>
          <div className="grid grid-cols-3 gap-2">
            {onCourt.map((p) => (
              <button
                key={p.number}
                type="button"
                onClick={() => onPickOut(p.number)}
                className="min-h-[56px] p-3 rounded-lg bg-secondary hover:bg-destructive/20 text-foreground text-sm font-bold active:scale-95"
              >
                #{p.number} {p.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Chi entra al posto di #{outNumber}?</p>
          <div className="grid grid-cols-3 gap-2">
            {bench.map((p) => (
              <button
                key={p.number}
                type="button"
                onClick={() => onPickIn(p.number)}
                className="min-h-[56px] p-3 rounded-lg bg-secondary hover:bg-accent/20 text-foreground text-sm font-bold active:scale-95"
              >
                #{p.number} {p.lastName}
              </button>
            ))}
            {bench.length === 0 && (
              <div className="col-span-3 text-center text-xs text-muted-foreground italic py-4">
                Nessun giocatore disponibile in panchina
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


export function EndSetDialog({
  open, onOpenChange, currentSet, homeName, awayName, homeScore, awayScore, onReport, onConfirm,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; currentSet: number;
  homeName: string; awayName: string; homeScore: number; awayScore: number;
  onReport: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fine set {currentSet}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center text-3xl font-black">
            {homeName} {homeScore} — {awayScore} {awayName}
          </div>
          <Button variant="outline" onClick={onReport} className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            Genera report PDF
          </Button>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="min-h-12 flex-1 rounded bg-secondary font-bold">
              Annulla
            </button>
            <button type="button" onClick={onConfirm} className="min-h-12 flex-1 rounded bg-primary font-black text-primary-foreground">
              Conferma
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LiveHeatmapFilters({
  homeTeam, awayTeam, skill, setSkill, team, setTeam, evaluation, setEvaluation, player, setPlayer,
}: {
  homeTeam: Team; awayTeam: Team;
  skill: 'A' | 'S' | 'R'; setSkill: (v: 'A' | 'S' | 'R') => void;
  team: 'home' | 'away' | 'all'; setTeam: (v: 'home' | 'away' | 'all') => void;
  evaluation: 'all' | '#' | '+' | '='; setEvaluation: (v: 'all' | '#' | '+' | '=') => void;
  player: number | null; setPlayer: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 bg-black/30 border-b border-border/50 text-xs">

          {/* Fondamentale */}
          {(['A', 'S', 'R'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkill(s)}
              className={cn('px-2 py-0.5 rounded',
                skill === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground')}
            >
              {s === 'A' ? 'Attacco' : s === 'S' ? 'Battuta' : 'Ricezione'}
            </button>
          ))}

          <div className="w-px bg-border" />

          {/* Squadra */}
          {(['all', 'home', 'away'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              className={cn('px-2 py-0.5 rounded',
                team === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground')}
            >
              {t === 'all' ? 'Tutte' : t === 'home'
                ? (homeTeam.name || 'Casa').slice(0, 8)
                : (awayTeam.name || 'Ospite').slice(0, 8)}
            </button>
          ))}

          <div className="w-px bg-border" />

          {/* Valutazione */}
          {(['all', '#', '+', '='] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEvaluation(e)}
              className={cn('px-2 py-0.5 rounded',
                evaluation === e
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground')}
            >
              {e === 'all' ? 'Tutti' : e === '#' ? 'Punto'
                : e === '+' ? 'Positivo' : 'Errore'}
            </button>
          ))}

          <div className="w-px bg-border" />

          {/* Giocatore — Select con tutti i giocatori della squadra filtrata */}
          <select
            value={player ?? ''}
            onChange={(e) => setPlayer(
              e.target.value ? Number(e.target.value) : null
            )}
            className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs border border-border"
          >
            <option value="">Tutti i giocatori</option>
            {(team === 'away' ? awayTeam : homeTeam)
              .players?.map((p) => (
              <option key={p.number} value={p.number}>
                #{p.number} {p.lastName}
              </option>
            ))}
            {team === 'all' && (
              <>
                <optgroup label={homeTeam.name || 'Casa'}>
                  {homeTeam.players?.map((p) => (
                    <option key={`h${p.number}`} value={p.number}>
                      #{p.number} {p.lastName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={awayTeam.name || 'Ospite'}>
                  {awayTeam.players?.map((p) => (
                    <option key={`a${p.number}`} value={p.number}>
                      #{p.number} {p.lastName}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>

          {/* Reset filtri */}
          <button
            type="button"
            onClick={() => {
              setTeam('all');
              setSkill('A');
              setEvaluation('all');
              setPlayer(null);
            }}
            className="px-2 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
    </div>
  );
}

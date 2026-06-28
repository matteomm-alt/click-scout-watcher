import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { Square, AlertTriangle, RotateCcw, BarChart2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { SanctionType, ScoutAction } from '@/types/volleyball';
import { toast } from 'sonner';

const sanctionMeta: Record<SanctionType, { label: string; color: string; icon: 'card' | 'square' }> = {
  yellow: { label: 'Giallo (Warning)', color: 'bg-yellow-500', icon: 'card' },
  red: { label: 'Rosso (Penalità)', color: 'bg-red-600', icon: 'card' },
  expulsion: { label: 'Espulsione', color: 'bg-red-800', icon: 'square' },
  disqualification: { label: 'Squalifica', color: 'bg-zinc-900 border border-red-600', icon: 'square' },
};

function ServeAnalysisButton({ open, setOpen, serverNumber, serveActions, zonePos, pct }: { open: boolean; setOpen: (v: boolean) => void; serverNumber: number; serveActions: ScoutAction[]; zonePos: (z?: number) => number[] | undefined; pct: (n: number) => number }) {
  const stat = {
    ace: serveActions.filter((a) => a.evaluation === '#').length,
    err: serveActions.filter((a) => a.evaluation === '=').length,
    pos: serveActions.filter((a) => a.evaluation === '#' || a.evaluation === '+').length,
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><button type="button" className="min-h-10 min-w-10 rounded-lg bg-secondary/50 hover:bg-secondary active:scale-95"><BarChart2 className="mx-auto h-4 w-4" /></button></SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader><SheetTitle>#{serverNumber} — Direzioni battuta</SheetTitle></SheetHeader>
        <svg viewBox="0 0 90 60" width="100%" className="mt-4 rounded-xl bg-orange-900/20">
          {[30, 60].map((x) => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="60" stroke="rgba(255,255,255,.25)" />)}
          {[20, 40].map((y) => <line key={`h-${y}`} x1="0" y1={y} x2="90" y2={y} stroke="rgba(255,255,255,.25)" />)}
          {serveActions.map((a) => { const s = zonePos(a.startZone); const e = zonePos(a.endZone); if (!s || !e) return null; const c = a.evaluation === '#' ? '#000' : a.evaluation === '=' ? '#dc2626' : a.evaluation === '/' ? '#ea580c' : '#ca8a04'; return <line key={a.id} x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={c} strokeWidth="1.8" strokeLinecap="round" />; })}
        </svg>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center"><div><div className="text-xs text-muted-foreground">Tot</div><div className="text-xl font-black">{serveActions.length}</div></div><div><div className="text-xs text-muted-foreground">Ace%</div><div className="text-xl font-black">{pct(stat.ace)}</div></div><div><div className="text-xs text-muted-foreground">Err%</div><div className="text-xl font-black">{pct(stat.err)}</div></div><div><div className="text-xs text-muted-foreground">Pos%</div><div className="text-xl font-black">{pct(stat.pos)}</div></div></div>
        <button type="button" onClick={() => setOpen(false)} className="mt-4 min-h-14 w-full rounded bg-secondary font-bold">Chiudi</button>
      </SheetContent>
    </Sheet>
  );
}

export function ScoreBoard() {
  const {
    homeTeam, awayTeam, matchState,
    callTimeout, addSanction, resetMatch, adjustScore, setServingTeam, rotateTeam,
  } = useMatchStore();

  const [sanctionOpen, setSanctionOpen] = useState(false);
  const [serveAnalysisOpen, setServeAnalysisOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [sanctionTeam, setSanctionTeam] = useState<'home' | 'away'>('home');
  const [sanctionType, setSanctionType] = useState<SanctionType>('yellow');
  const [sanctionPlayer, setSanctionPlayer] = useState<string>('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleTimeout = (team: 'home' | 'away') => {
    const ok = callTimeout(team);
    const teamName = team === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');
    if (ok) {
      window.dispatchEvent(new CustomEvent('scout-timeout', { detail: { team } }));
      toast.success(`Time-out ${teamName}`, {
        description: `Set ${matchState.currentSet} • ${matchState.homeScore}-${matchState.awayScore}`,
      });
    } else {
      toast.error(`${teamName} ha già usato i 2 time-out di questo set`);
    }
  };

  const submitSanction = () => {
    const num = sanctionPlayer.trim() === '' ? null : Number(sanctionPlayer);
    addSanction(sanctionTeam, sanctionType, Number.isFinite(num as number) ? (num as number) : null);
    setSanctionOpen(false);
    setSanctionPlayer('');
    toast.success(`${sanctionMeta[sanctionType].label} a ${sanctionTeam === 'home' ? homeTeam.name || 'Casa' : awayTeam.name || 'Ospite'}`);
  };

  const TimeoutDots = ({ used }: { used: number }) => (
    <div className="flex gap-0.5">
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i < used ? 'bg-warning' : 'bg-muted-foreground/30'}`}
          title={i < used ? 'Time-out usato' : 'Time-out disponibile'}
        />
      ))}
    </div>
  );

  const TeamSanctions = ({ team }: { team: 'home' | 'away' }) => {
    const list = matchState.sanctions.filter((s) => s.team === team);
    if (list.length === 0) return null;
    return (
      <div className="flex gap-0.5">
        {list.map((s) => (
          <span
            key={s.id}
            className={`w-2 h-3 rounded-sm ${sanctionMeta[s.type].color}`}
            title={`${sanctionMeta[s.type].label}${s.playerNumber ? ` • #${s.playerNumber}` : ''} • Set ${s.setNumber}`}
          />
        ))}
      </div>
    );
  };

  const ServingDot = ({ active }: { active: boolean }) =>
    active ? (
      <span className="relative inline-flex w-2.5 h-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning shadow-[0_0_8px_hsl(var(--warning))]" />
      </span>
    ) : (
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
    );

  const serverNumber = matchState.servingTeam === 'home' ? matchState.homeCurrentLineup[0] : matchState.awayCurrentLineup[0];
  const serverTeam = matchState.servingTeam;
  const serveActions = matchState.actions.filter((a) => a.skill === 'S' && a.playerNumber === serverNumber && a.team === serverTeam);
  const zonePos = (z?: number) => ({ 4: [15, 10], 3: [45, 10], 2: [75, 10], 5: [15, 30], 6: [45, 30], 1: [75, 30], 7: [15, 50], 8: [45, 50], 9: [75, 50] } as Record<number, number[]>)[z || 0];
  const pct = (n: number) => serveActions.length ? Math.round((n / serveActions.length) * 100) : 0;

  return (
    <div className="glass rounded-lg px-2 py-1 flex items-center gap-2 text-xs">
      {/* HOME compact */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <TeamSanctions team="home" />
        <ServingDot active={matchState.servingTeam === 'home'} />
        <span className="text-[10px] text-muted-foreground/80 truncate max-w-[80px] font-bold uppercase tracking-wider">
          {homeTeam.name || 'Casa'}
        </span>
        <span className="text-[9px] font-black px-1 py-0.5 rounded bg-primary/20 text-primary tabular-nums">
          R{matchState.homeSetterPosition}
        </span>
        <span className="text-[9px] font-black px-1 py-0.5 rounded bg-warning/20 text-warning tabular-nums">
          #{matchState.homeCurrentLineup[0]}
        </span>
        <TimeoutDots used={matchState.homeTimeoutsUsed} />
        <button
          type="button"
          onClick={() => handleTimeout('home')}
          className="h-7 px-1.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-[9px] font-bold uppercase tracking-wider active:scale-95"
          title="Time-out Casa"
        >
          T-out
        </button>
      </div>

      {/* SETS + SCORE — riga unica compatta */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-base font-bold text-primary tabular-nums">{matchState.homeSetsWon}</span>
        <span className="text-[9px] font-bold text-muted-foreground uppercase">Set</span>
        <span className="text-muted-foreground/40">·</span>
        <div className={`text-2xl font-black tabular-nums leading-none transition-all ${
          matchState.servingTeam === 'home' ? 'text-warning' : 'text-foreground/80'
        }`}>
          {matchState.homeScore}
        </div>
        {matchState.servingTeam === 'home' && (
          <ServeAnalysisButton open={serveAnalysisOpen} setOpen={setServeAnalysisOpen} serverNumber={serverNumber} serveActions={serveActions} zonePos={zonePos} pct={pct} />
        )}
        <span className="text-sm text-muted-foreground font-light">:</span>
        {matchState.servingTeam === 'away' && (
          <ServeAnalysisButton open={serveAnalysisOpen} setOpen={setServeAnalysisOpen} serverNumber={serverNumber} serveActions={serveActions} zonePos={zonePos} pct={pct} />
        )}
        <div className={`text-2xl font-black tabular-nums leading-none transition-all ${
          matchState.servingTeam === 'away' ? 'text-warning' : 'text-foreground/80'
        }`}>
          {matchState.awayScore}
        </div>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-[9px] font-bold text-muted-foreground uppercase">Set</span>
        <span className="text-base font-bold text-primary tabular-nums">{matchState.awaySetsWon}</span>
        <span className="ml-1 px-1.5 py-0.5 rounded bg-secondary text-center">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Set</span>
          <span className="text-xs font-bold text-primary tabular-nums">{matchState.currentSet}</span>
        </span>
      </div>

      {/* AWAY compact */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => handleTimeout('away')}
          className="h-7 px-1.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-[9px] font-bold uppercase tracking-wider active:scale-95"
          title="Time-out Ospite"
        >
          T-out
        </button>
        <TimeoutDots used={matchState.awayTimeoutsUsed} />
        <span className="text-[9px] font-black px-1 py-0.5 rounded bg-warning/20 text-warning tabular-nums">
          #{matchState.awayCurrentLineup[0]}
        </span>
        <span className="text-[9px] font-black px-1 py-0.5 rounded bg-primary/20 text-primary tabular-nums">
          R{matchState.awaySetterPosition}
        </span>
        <span className="text-[10px] text-muted-foreground/80 truncate max-w-[80px] font-bold uppercase tracking-wider">
          {awayTeam.name || 'Ospite'}
        </span>
        <ServingDot active={matchState.servingTeam === 'away'} />
        <TeamSanctions team="away" />
      </div>


      {/* Sanction dialog */}
      <Dialog open={sanctionOpen} onOpenChange={setSanctionOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="h-7 px-1.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider active:scale-95"
            title="Cartellino / Sanzione"
          >
            <Square className="w-3 h-3" />
            Card
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Sanzione / Cartellino
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Squadra</div>
              <div className="grid grid-cols-2 gap-2">
                {(['home', 'away'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSanctionTeam(t)}
                    className={`min-h-14 px-4 rounded-md text-sm font-bold transition-colors active:scale-95 ${
                      sanctionTeam === t
                        ? t === 'home' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tipo</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(sanctionMeta) as SanctionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSanctionType(t)}
                    className={`flex min-h-16 items-center gap-2 p-4 rounded-md text-base font-bold transition-all active:scale-95 ${
                      sanctionType === t ? 'ring-2 ring-primary scale-[1.02]' : 'opacity-80'
                    }`}
                  >
                    <span className={`w-3 h-4 rounded-sm ${sanctionMeta[t].color}`} />
                    <span className="text-foreground">{sanctionMeta[t].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                N° Giocatore <span className="opacity-60">(vuoto = staff/squadra)</span>
              </div>
              <input
                type="number"
                value={sanctionPlayer}
                onChange={(e) => setSanctionPlayer(e.target.value)}
                placeholder="Es. 7"
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 min-h-12 active:scale-95" onClick={() => setSanctionOpen(false)}>
                Annulla
              </Button>
              <Button className="flex-1 min-h-12 active:scale-95" onClick={submitSanction}>
                Registra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogTrigger asChild><button type="button" className="h-7 px-1.5 text-[9px] font-bold bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground rounded uppercase tracking-wider">✎ Corr</button></DialogTrigger>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Correzione</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => adjustScore('home', 1)} className="min-h-12 px-4 font-black bg-secondary rounded">+1 Casa</button>
            <button onClick={() => adjustScore('away', 1)} className="min-h-12 px-4 font-black bg-secondary rounded">+1 Ospite</button>
            <button onClick={() => adjustScore('home', -1)} className="min-h-12 px-4 font-black bg-secondary rounded">-1 Casa</button>
            <button onClick={() => adjustScore('away', -1)} className="min-h-12 px-4 font-black bg-secondary rounded">-1 Ospite</button>
            <button onClick={() => setServingTeam('home')} className="min-h-12 px-6 font-bold bg-secondary rounded">Serve Casa</button>
            <button onClick={() => setServingTeam('away')} className="min-h-12 px-6 font-bold bg-secondary rounded">Serve Ospite</button>
            <button onClick={() => rotateTeam('home')} className="min-h-12 px-4 font-black bg-secondary rounded">Ruota Casa ↺</button>
            <button onClick={() => rotateTeam('away')} className="min-h-12 px-4 font-black bg-secondary rounded">Ruota Ospite ↺</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset match */}
      <button
        type="button"
        onClick={() => setResetConfirmOpen(true)}
        className="min-h-12 min-w-12 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors active:scale-95"
        title="Reset partita"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resettare la partita?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i dati della partita corrente verranno persi definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { resetMatch(); toast.info('Partita resettata'); }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

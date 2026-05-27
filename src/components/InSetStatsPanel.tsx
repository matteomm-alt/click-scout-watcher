import { useMemo } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Skill, ScoutAction } from '@/types/volleyball';

const SKILL_META: { key: Skill; label: string; color: string }[] = [
  { key: 'S', label: 'Servizio',  color: 'bg-[hsl(var(--cs-cta))/.85] text-black' },
  { key: 'R', label: 'Ricezione', color: 'bg-cyan-600/80 text-white' },
  { key: 'A', label: 'Attacco',   color: 'bg-red-600/85 text-white' },
  { key: 'B', label: 'Muro',      color: 'bg-purple-600/85 text-white' },
];

interface SkillStats { tot: number; punti: number; errori: number; eff: number; }

function computeSkill(actions: ScoutAction[], team: 'home' | 'away', skill: Skill): SkillStats {
  const list = actions.filter(a => a.team === team && a.skill === skill);
  const tot = list.length;
  const punti = list.filter(a => a.evaluation === '#').length;
  const errori = list.filter(a => a.evaluation === '=').length;
  const eff = tot > 0 ? Math.round(((punti - errori) / tot) * 100) : 0;
  return { tot, punti, errori, eff };
}

export function InSetStatsPanel() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();

  const setActions = useMemo(
    () => matchState.actions.filter(a => a.setNumber === matchState.currentSet),
    [matchState.actions, matchState.currentSet]
  );

  // Breakdown per giocatore (set corrente)
  const playerBreakdown = useMemo(() => {
    type Row = { team: 'home' | 'away'; num: number; name: string; skill: Skill; tot: number; pts: number; err: number; eff: number };
    const map = new Map<string, Omit<Row, 'eff'>>();
    for (const a of setActions) {
      if (!['S', 'R', 'A', 'B'].includes(a.skill)) continue;
      const key = `${a.team}-${a.playerNumber}-${a.skill}`;
      const td = a.team === 'home' ? homeTeam : awayTeam;
      const pl = td.players.find(p => p.number === a.playerNumber);
      const cur = map.get(key) ?? { team: a.team, num: a.playerNumber, name: pl?.lastName ?? `#${a.playerNumber}`, skill: a.skill, tot: 0, pts: 0, err: 0 };
      cur.tot++;
      if (a.evaluation === '#') cur.pts++;
      if (a.evaluation === '=') cur.err++;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((v): Row => ({ ...v, eff: v.tot > 0 ? Math.round(((v.pts - v.err) / v.tot) * 100) : 0 }))
      .filter(r => r.tot >= 2)
      .sort((a, b) => b.tot - a.tot)
      .slice(0, 6);
  }, [setActions, homeTeam, awayTeam]);

  const { sideoutHome, breakHome, sideoutAway, breakAway } = useMemo(() => {
    // Calcolo via servingTeam: chi serviva determina K2 (break) o K1 (sideout) per l'avversario
    const serveActions = setActions.filter(a => a.skill === 'S');
    let soH = 0, soHTot = 0, bH = 0, bHTot = 0;
    let soA = 0, soATot = 0, bA = 0, bATot = 0;

    for (const a of serveActions) {
      if (a.servingTeam === 'home') {
        bHTot++; soATot++;
        if (a.evaluation === '#') bH++;       // ace = break home
        if (a.evaluation === '=') soA++;      // errore battuta home = sideout away
      } else if (a.servingTeam === 'away') {
        bATot++; soHTot++;
        if (a.evaluation === '#') bA++;
        if (a.evaluation === '=') soH++;
      }
    }

    return {
      sideoutHome: soHTot > 0 ? Math.round((soH / soHTot) * 100) : 0,
      breakHome:   bHTot  > 0 ? Math.round((bH / bHTot)  * 100) : 0,
      sideoutAway: soATot > 0 ? Math.round((soA / soATot) * 100) : 0,
      breakAway:   bATot  > 0 ? Math.round((bA / bATot)  * 100) : 0,
    };
  }, [setActions]);

  const renderRow = (team: 'home' | 'away') => (
    <div className="space-y-1.5">
      {SKILL_META.map(sk => {
        const s = computeSkill(setActions, team, sk.key);
        const effPos = s.eff >= 0;
        return (
          <div key={sk.key} className="rounded-lg bg-secondary/40 border border-border/40 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-[10px] font-black ${sk.color}`}>{sk.key}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{sk.label}</span>
              <span className="text-xs font-black tabular-nums">{s.tot}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-emerald-400 font-bold">#{s.punti}</span>
              <span className="text-destructive font-bold">={s.errori}</span>
              <span className={`font-black tabular-nums ${effPos ? 'text-emerald-400' : 'text-destructive'}`}>{s.eff > 0 ? '+' : ''}{s.eff}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full ${effPos ? 'bg-emerald-500' : 'bg-destructive'}`}
                style={{ width: `${Math.min(100, Math.abs(s.eff))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Set {matchState.currentSet}</div>
          <div className="text-2xl font-black tabular-nums">{matchState.homeScore} – {matchState.awayScore}</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Rotazione P (S)</div>
          <div className="text-2xl font-black tabular-nums">{matchState.homeSetterPosition} · {matchState.awaySetterPosition}</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Side-out</div>
          <div className="text-base font-black tabular-nums">{sideoutHome}% · {sideoutAway}%</div>
        </div>
        <div className="glass rounded-xl p-2 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Break</div>
          <div className="text-base font-black tabular-nums">{breakHome}% · {breakAway}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-blue-300 mb-1.5 text-center">
            {homeTeam.name || 'Casa'}
          </div>
          {renderRow('home')}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-red-300 mb-1.5 text-center">
            {awayTeam.name || 'Ospite'}
          </div>
          {renderRow('away')}
        </div>
      </div>

      {/* Breakdown per giocatore — set corrente */}
      {playerBreakdown.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-secondary/30 p-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 text-center">
            Top giocatori · set {matchState.currentSet}
          </div>
          <div className="space-y-1">
            {playerBreakdown.map((r) => {
              const skMeta = SKILL_META.find(s => s.key === r.skill)!;
              const effPos = r.eff >= 0;
              return (
                <div key={`${r.team}-${r.num}-${r.skill}`} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.team === 'home' ? 'bg-blue-400' : 'bg-red-400'}`} />
                  <span className="font-mono font-black tabular-nums w-7 text-right">#{r.num}</span>
                  <span className="truncate flex-1 font-bold">{r.name}</span>
                  <span className={`inline-flex items-center justify-center min-w-5 h-4 px-1 rounded text-[9px] font-black ${skMeta.color}`}>{r.skill}</span>
                  <span className="text-emerald-400 font-bold tabular-nums w-6 text-right">#{r.pts}</span>
                  <span className="text-destructive font-bold tabular-nums w-6 text-right">={r.err}</span>
                  <span className={`font-black tabular-nums w-12 text-right ${effPos ? 'text-emerald-400' : 'text-destructive'}`}>{r.eff > 0 ? '+' : ''}{r.eff}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

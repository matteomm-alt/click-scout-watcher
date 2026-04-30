import { useMemo, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ScoutAction, Skill } from '@/types/volleyball';

type TeamFilter = 'home' | 'away';
type PhaseFilter = 'all' | 'K1' | 'K2';
type SkillMetric = 'A' | 'R' | 'S' | 'B';

interface PlayerRow {
  number: number;
  name: string;
  // Attack
  attTot: number;
  attKills: number;       // # = winning point
  attErrors: number;      // = or /
  // Reception
  recTot: number;
  recPositive: number;    // + or #
  recErrors: number;      // = or /
  // Serve
  srvTot: number;
  srvAces: number;        // #
  srvErrors: number;      // =
  // Block
  blkKills: number;       // # block point
  blkErrors: number;      // =
  // General
  totalErrors: number;
  totalPoints: number;    // ace + kill + block point
}

const isError = (e: ScoutAction['evaluation']) => e === '=' || e === '/';
const isPositive = (e: ScoutAction['evaluation']) => e === '+' || e === '#';
const isPoint = (e: ScoutAction['evaluation']) => e === '#';

function buildRow(actions: ScoutAction[], number: number, name: string): PlayerRow {
  const row: PlayerRow = {
    number, name,
    attTot: 0, attKills: 0, attErrors: 0,
    recTot: 0, recPositive: 0, recErrors: 0,
    srvTot: 0, srvAces: 0, srvErrors: 0,
    blkKills: 0, blkErrors: 0,
    totalErrors: 0, totalPoints: 0,
  };
  for (const a of actions) {
    if (a.playerNumber !== number) continue;
    const skill: Skill = a.skill;
    if (skill === 'A') {
      row.attTot++;
      if (isPoint(a.evaluation)) row.attKills++;
      if (isError(a.evaluation)) row.attErrors++;
    } else if (skill === 'R') {
      row.recTot++;
      if (isPositive(a.evaluation)) row.recPositive++;
      if (isError(a.evaluation)) row.recErrors++;
    } else if (skill === 'S') {
      row.srvTot++;
      if (isPoint(a.evaluation)) row.srvAces++;
      if (a.evaluation === '=') row.srvErrors++;
    } else if (skill === 'B') {
      if (isPoint(a.evaluation)) row.blkKills++;
      if (a.evaluation === '=') row.blkErrors++;
    }
  }
  row.totalErrors = row.attErrors + row.srvErrors + row.blkErrors;
  row.totalPoints = row.attKills + row.srvAces + row.blkKills;
  return row;
}

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

// Attack efficiency (FIVB) = (kills - errors) / total_attempts
const eff = (kills: number, errors: number, total: number) =>
  total > 0 ? Math.round(((kills - errors) / total) * 100) : 0;

function phaseForAction(actions: ScoutAction[], index: number): 'K1' | 'K2' | null {
  const action = actions[index];
  if (!action) return null;
  if (action.skill === 'S') return 'K2';

  for (let i = index - 1; i >= 0; i--) {
    const prev = actions[i];
    if (prev.setNumber !== action.setNumber) break;
    if (prev.skill !== 'S') continue;
    return prev.team === action.team ? 'K2' : 'K1';
  }
  return null;
}

function playerSkillMetrics(actions: ScoutAction[], playerNumber: number, skill: SkillMetric) {
  const skillActions = actions.filter((a) => a.playerNumber === playerNumber && a.skill === skill);
  const total = skillActions.length;
  const perfect = skillActions.filter((a) => a.evaluation === '#').length;
  const errors = skillActions.filter((a) => isError(a.evaluation)).length;
  return {
    total,
    perfectPct: pct(perfect, total),
    errorPct: pct(errors, total),
    efficiency: eff(perfect, errors, total),
  };
}

export function PlayerStatsPanel() {
  const { matchState, homeTeam, awayTeam } = useMatchStore();
  const [team, setTeam] = useState<TeamFilter>('home');

  const rows = useMemo(() => {
    const teamData = team === 'home' ? homeTeam : awayTeam;
    const teamActions = matchState.actions.filter((a) => a.team === team);

    // Players that appear in roster OR have actions
    const numbers = new Set<number>();
    teamData.players.forEach((p) => numbers.add(p.number));
    teamActions.forEach((a) => numbers.add(a.playerNumber));

    const out: PlayerRow[] = [];
    numbers.forEach((num) => {
      const player = teamData.players.find((p) => p.number === num);
      const name = player ? player.lastName : `#${num}`;
      const row = buildRow(teamActions, num, name);
      // Only include players with at least one action
      if (row.attTot + row.recTot + row.srvTot + row.blkKills + row.blkErrors > 0) {
        out.push(row);
      }
    });
    out.sort((a, b) => b.totalPoints - a.totalPoints || a.number - b.number);
    return out;
  }, [matchState.actions, team, homeTeam, awayTeam]);

  const colorBy = (val: number, kind: 'eff' | 'pct') => {
    if (kind === 'eff') {
      if (val >= 30) return 'text-emerald-400';
      if (val >= 10) return 'text-foreground';
      if (val >= 0) return 'text-warning';
      return 'text-destructive';
    }
    if (val >= 60) return 'text-emerald-400';
    if (val >= 40) return 'text-foreground';
    if (val >= 20) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Statistiche Giocatori
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">{rows.length} att.</span>
      </div>

      {/* Team toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-secondary/40 border border-border/50">
        {(['home', 'away'] as const).map((k) => {
          const active = team === k;
          const label = k === 'home' ? (homeTeam.name || 'Casa') : (awayTeam.name || 'Ospite');
          const cls = active
            ? k === 'home' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary';
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTeam(k)}
              className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors truncate ${cls}`}
            >
              {label.slice(0, 14)}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-3">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-1 py-1 font-bold">#</th>
                <th className="text-left px-1 py-1 font-bold">Gioc.</th>
                <th className="text-right px-1 py-1 font-bold" title="Punti totali (attacchi + ace + muri)">P</th>
                <th className="text-right px-1 py-1 font-bold" title="Errori totali">E</th>
                <th className="text-right px-1 py-1 font-bold" title="Efficienza attacco %">Att%</th>
                <th className="text-right px-1 py-1 font-bold" title="Ricezione positiva %">Ric%</th>
                <th className="text-right px-1 py-1 font-bold" title="Ace">A</th>
                <th className="text-right px-1 py-1 font-bold" title="Muri punto">B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const attEff = eff(r.attKills, r.attErrors, r.attTot);
                const recPos = pct(r.recPositive, r.recTot);
                return (
                  <tr key={r.number} className="border-t border-border/40 hover:bg-secondary/30">
                    <td className="px-1 py-1 font-mono font-bold text-primary">{r.number}</td>
                    <td className="px-1 py-1 text-foreground truncate max-w-[60px]">{r.name}</td>
                    <td className="px-1 py-1 text-right font-bold text-emerald-400">{r.totalPoints}</td>
                    <td className="px-1 py-1 text-right font-bold text-destructive">{r.totalErrors}</td>
                    <td className={`px-1 py-1 text-right font-bold tabular-nums ${colorBy(attEff, 'eff')}`}>
                      {r.attTot > 0 ? `${attEff}%` : '–'}
                      <div className="text-[8px] text-muted-foreground font-normal">
                        {r.attKills}/{r.attErrors}/{r.attTot}
                      </div>
                    </td>
                    <td className={`px-1 py-1 text-right font-bold tabular-nums ${colorBy(recPos, 'pct')}`}>
                      {r.recTot > 0 ? `${recPos}%` : '–'}
                      <div className="text-[8px] text-muted-foreground font-normal">
                        {r.recPositive}/{r.recErrors}/{r.recTot}
                      </div>
                    </td>
                    <td className="px-1 py-1 text-right font-bold text-blue-400">{r.srvAces}</td>
                    <td className="px-1 py-1 text-right font-bold text-purple-400">{r.blkKills}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[9px] text-muted-foreground mt-1 px-1">
            Att%: efficienza (kill-err)/tot · Ric%: positive/tot · sotto: kill/err/tot
          </div>
        </div>
      )}
    </div>
  );
}

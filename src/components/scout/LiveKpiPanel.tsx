import { useMemo } from 'react';
import type { ScoutAction } from '@/types/volleyball';

type MatchAction = ScoutAction;

interface LiveKpiPanelProps {
  actions: MatchAction[];
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  currentSet: number;
}

interface RallyOutcome {
  servingTeam: 'home' | 'away';
  receivingTeam: 'home' | 'away';
  winner: 'home' | 'away' | null;
  firstAttackKill: boolean; // primo attacco della squadra ricevente = #
  firstAttackByReceiver: boolean;
}

function analyzeRallies(actions: MatchAction[]): RallyOutcome[] {
  // Raggruppa per rallyId (o per finestra tra due 'S' consecutive se manca).
  const groups = new Map<string, MatchAction[]>();
  actions.forEach((a, i) => {
    const key = a.rallyId ?? `idx_${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  });

  const rallies: RallyOutcome[] = [];
  for (const acts of groups.values()) {
    const serve = acts.find(a => a.skill === 'S');
    if (!serve) continue;
    const servingTeam = serve.team;
    const receivingTeam: 'home' | 'away' = servingTeam === 'home' ? 'away' : 'home';

    const last = acts[acts.length - 1];
    let winner: 'home' | 'away' | null = null;
    if (last.evaluation === '#') winner = last.team;
    else if (last.evaluation === '=' || last.evaluation === '/') {
      winner = last.team === 'home' ? 'away' : 'home';
    }

    const firstAttack = acts.find(a => a.skill === 'A');
    const firstAttackByReceiver = !!firstAttack && firstAttack.team === receivingTeam;
    const firstAttackKill = firstAttackByReceiver && firstAttack?.evaluation === '#';

    rallies.push({ servingTeam, receivingTeam, winner, firstAttackKill, firstAttackByReceiver });
  }
  return rallies;
}

function pct(n: number, d: number): number | null {
  if (d === 0) return null;
  return Math.round((n / d) * 100);
}

function colorFor(v: number | null): string {
  if (v === null) return 'text-muted-foreground';
  if (v > 50) return 'text-emerald-400';
  if (v >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export function LiveKpiPanel({
  actions,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  currentSet,
}: LiveKpiPanelProps) {
  const kpi = useMemo(() => {
    const setActions = actions.filter(a => a.setNumber === currentSet);
    const rallies = analyzeRallies(setActions);

    const so = (team: 'home' | 'away') => {
      const k1 = rallies.filter(r => r.receivingTeam === team);
      const won = k1.filter(r => r.winner === team).length;
      return { pct: pct(won, k1.length), won, tot: k1.length };
    };
    const fbso = (team: 'home' | 'away') => {
      const k1 = rallies.filter(r => r.receivingTeam === team && r.firstAttackByReceiver);
      const won = k1.filter(r => r.firstAttackKill).length;
      return { pct: pct(won, k1.length), won, tot: k1.length };
    };

    // Rotazione corrente home + delta
    const homeActions = setActions.filter(a => a.team === 'home' || a.team === 'away');
    // Ricava la rotazione corrente dall'ultima azione
    const lastAny = setActions[setActions.length - 1];
    const currentRot = lastAny?.homeSetterPosition ?? null;

    let delta = 0;
    if (currentRot !== null) {
      // Somma per rally: attribuisce +1 a home se ha vinto il rally quando homeSetterPosition===currentRot all'inizio del rally.
      const perRally = new Map<string, { rot: number; winner: 'home' | 'away' | null }>();
      setActions.forEach((a, i) => {
        const key = a.rallyId ?? `idx_${i}`;
        if (!perRally.has(key)) perRally.set(key, { rot: a.homeSetterPosition, winner: null });
      });
      // winner per rally
      for (const [k, v] of perRally) {
        const acts = homeActions.filter((a, i) => (a.rallyId ?? `idx_${i}`) === k);
        const last = acts[acts.length - 1];
        if (!last) continue;
        if (last.evaluation === '#') v.winner = last.team;
        else if (last.evaluation === '=' || last.evaluation === '/') v.winner = last.team === 'home' ? 'away' : 'home';
      }
      for (const v of perRally.values()) {
        if (v.rot !== currentRot) continue;
        if (v.winner === 'home') delta += 1;
        else if (v.winner === 'away') delta -= 1;
      }
    }

    return {
      soHome: so('home'),
      soAway: so('away'),
      fbsoHome: fbso('home'),
      fbsoAway: fbso('away'),
      currentRot,
      delta,
    };
  }, [actions, currentSet]);

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-card p-2">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </div>
      {children}
    </div>
  );

  const StatPair = ({
    label1, val1, label2, val2,
  }: { label1: string; val1: number | null; label2: string; val2: number | null }) => (
    <div className="flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[9px] uppercase text-muted-foreground truncate">{label1}</div>
        <div className={`text-xl font-black tabular-nums ${colorFor(val1)}`}>
          {val1 === null ? '—' : `${val1}%`}
        </div>
      </div>
      <div className="min-w-0 text-right">
        <div className="text-[9px] uppercase text-muted-foreground truncate">{label2}</div>
        <div className={`text-xl font-black tabular-nums ${colorFor(val2)}`}>
          {val2 === null ? '—' : `${val2}%`}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-2" style={{ maxHeight: 160 }}>
      <Card title="Side-out">
        <StatPair
          label1={homeTeamName} val1={kpi.soHome.pct}
          label2={awayTeamName} val2={kpi.soAway.pct}
        />
      </Card>
      <Card title="FBSO">
        <StatPair
          label1={homeTeamName} val1={kpi.fbsoHome.pct}
          label2={awayTeamName} val2={kpi.fbsoAway.pct}
        />
      </Card>
      <Card title="Rotazione">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[9px] uppercase text-muted-foreground">P{kpi.currentRot ?? '—'}</div>
            <div className={`text-xl font-black tabular-nums ${
              kpi.delta > 0 ? 'text-emerald-400' : kpi.delta < 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {kpi.delta > 0 ? `+${kpi.delta}` : kpi.delta}
            </div>
          </div>
          <div className="text-[9px] uppercase text-muted-foreground text-right">
            {homeScore}-{awayScore}<br/>set {currentSet}
          </div>
        </div>
      </Card>
    </div>
  );
}

interface LiveKpiBannerProps {
  actions: MatchAction[];
  currentSet: number;
}

export function LiveKpiBanner({ actions, currentSet }: LiveKpiBannerProps) {
  const kpi = useMemo(() => {
    const setActions = actions.filter(a => a.setNumber === currentSet);
    const rallies = analyzeRallies(setActions);
    const so = (team: 'home' | 'away') => {
      const k1 = rallies.filter(r => r.receivingTeam === team);
      return pct(k1.filter(r => r.winner === team).length, k1.length);
    };
    const fbso = (team: 'home' | 'away') => {
      const k1 = rallies.filter(r => r.receivingTeam === team && r.firstAttackByReceiver);
      return pct(k1.filter(r => r.firstAttackKill).length, k1.length);
    };
    return {
      soH: so('home'), soA: so('away'),
      fbH: fbso('home'), fbA: fbso('away'),
    };
  }, [actions, currentSet]);

  const fmt = (v: number | null) => v === null ? '—' : `${v}%`;
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider text-center py-1 px-2 bg-secondary/60 border-t border-border">
      <span className="text-muted-foreground">SO </span>
      <span className={colorFor(kpi.soH)}>{fmt(kpi.soH)}</span>
      <span className="text-muted-foreground">·</span>
      <span className={colorFor(kpi.soA)}>{fmt(kpi.soA)}</span>
      <span className="text-muted-foreground mx-2">|</span>
      <span className="text-muted-foreground">FBSO </span>
      <span className={colorFor(kpi.fbH)}>{fmt(kpi.fbH)}</span>
      <span className="text-muted-foreground">·</span>
      <span className={colorFor(kpi.fbA)}>{fmt(kpi.fbA)}</span>
    </div>
  );
}

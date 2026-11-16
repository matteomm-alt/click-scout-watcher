import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMatchStore } from '@/store/matchStore';
import { ROLE_SHORT, type Lineup, type Team } from '@/types/volleyball';

const POS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const;
const NONE = '__none__';

interface Props {
  open: boolean;
  setNumber: number;
  onDone: () => void;
}

function TeamColumn({
  title, team, lineup, onChange,
}: {
  title: string;
  team: Team;
  lineup: Lineup;
  onChange: (patch: Partial<Lineup>) => void;
}) {
  const chosen = POS.map((k) => lineup[k]).filter(Boolean) as string[];
  const duplicates = chosen.length !== new Set(chosen).size;
  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm">{title}</div>
      {POS.map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <span className="w-8 font-mono uppercase">{k}</span>
          <select
            className="flex-1 h-10 rounded-md border bg-background px-2"
            value={lineup[k] ?? NONE}
            onChange={(e) => onChange({ [k]: e.target.value === NONE ? null : e.target.value } as Partial<Lineup>)}
          >
            <option value={NONE}>—</option>
            {team.players.filter((p) => !p.isLibero).map((p) => (
              <option key={p.id} value={p.id}>
                {p.number} · {p.lastName} ({ROLE_SHORT[p.role] ?? p.role})
              </option>
            ))}
          </select>
          <input
            type="radio"
            name={`setter-${team.id}`}
            aria-label={`Palleggiatore in ${k}`}
            checked={!!lineup[k] && lineup.setter === lineup[k]}
            onChange={() => onChange({ setter: lineup[k] })}
            className="h-5 w-5"
          />
        </label>
      ))}
      <div className="text-xs text-muted-foreground">Il cerchio indica il palleggiatore.</div>
      {duplicates && <div className="text-xs text-destructive">Giocatore ripetuto in più posizioni.</div>}
    </div>
  );
}

export function SetLineupDialog({ open, setNumber, onDone }: Props) {
  const { homeTeam, awayTeam, homeLineup, awayLineup, setHomeLineup, setAwayLineup, startSet } = useMatchStore();
  const [home, setHome] = useState<Lineup>(homeLineup);
  const [away, setAway] = useState<Lineup>(awayLineup);

  // Ogni volta che il dialogo si apre riparte dall'ultima formazione configurata.
  useEffect(() => {
    if (open) { setHome(homeLineup); setAway(awayLineup); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const problems = useMemo(() => {
    const out: string[] = [];
    for (const [name, l] of [['Casa', home], ['Ospite', away]] as const) {
      const ids = POS.map((k) => l[k]);
      if (ids.some((x) => !x)) out.push(`${name}: formazione incompleta`);
      else if (new Set(ids).size !== 6) out.push(`${name}: giocatore ripetuto`);
      if (!l.setter || !ids.includes(l.setter)) out.push(`${name}: scegli il palleggiatore tra i sei in campo`);
    }
    return out;
  }, [home, away]);

  const confirm = () => {
    setHomeLineup(home);
    setAwayLineup(away);
    startSet();
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* si chiude solo confermando */ }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Formazione iniziale · Set {setNumber}</DialogTitle>
          <DialogDescription>
            Parte da quella del set precedente: cambia solo ciò che serve.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamColumn title={homeTeam.name || 'Casa'} team={homeTeam} lineup={home} onChange={(p) => setHome((l) => ({ ...l, ...p }))} />
          <TeamColumn title={awayTeam.name || 'Ospite'} team={awayTeam} lineup={away} onChange={(p) => setAway((l) => ({ ...l, ...p }))} />
        </div>
        {problems.length > 0 && (
          <ul className="text-xs text-destructive list-disc pl-5">
            {problems.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={confirm} disabled={problems.length > 0} className="h-11">Inizia il set</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

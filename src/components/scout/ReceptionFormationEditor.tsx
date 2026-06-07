import { useState, useRef } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Move, Save, FolderOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useFormationTemplates, type FormationTemplate } from '@/hooks/useFormationTemplates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EditorMode = 'reception' | 'attack';

const SETTER_ROTATIONS: Array<{ value: 1|2|3|4|5|6; label: string; desc: string }> = [
  { value: 1, label: 'S1', desc: 'Palleggiatore in P1 (back-right)' },
  { value: 2, label: 'S2', desc: 'Palleggiatore in P2 (front-right)' },
  { value: 3, label: 'S3', desc: 'Palleggiatore in P3 (front-middle)' },
  { value: 4, label: 'S4', desc: 'Palleggiatore in P4 (front-left)' },
  { value: 5, label: 'S5', desc: 'Palleggiatore in P5 (back-left)' },
  { value: 6, label: 'S6', desc: 'Palleggiatore in P6 (back-middle)' },
];

function FormationCanvas({
  team,
  setterPos,
  mode,
}: {
  team: 'home' | 'away';
  setterPos: 1|2|3|4|5|6;
  mode: EditorMode;
}) {
  const receptionFormations = useMatchStore((s) =>
    team === 'home' ? s.homeReceptionFormations : s.awayReceptionFormations
  );
  const attackFormations = useMatchStore((s) =>
    team === 'home' ? s.homeAttackFormations : s.awayAttackFormations
  );
  const formations = mode === 'reception' ? receptionFormations : attackFormations;

  const setReceptionPosition = useMatchStore((s) => s.setReceptionPosition);
  const setAttackPosition = useMatchStore((s) => s.setAttackPosition);
  const setPosition = mode === 'reception' ? setReceptionPosition : setAttackPosition;

  const teamData = useMatchStore((s) => (team === 'home' ? s.homeTeam : s.awayTeam));
  const lineup = useMatchStore((s) =>
    team === 'home' ? s.matchState.homeCurrentLineup : s.matchState.awayCurrentLineup
  );

  const slots = formations[setterPos];
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const onPointerDown = (slot: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(slot);
  };

  const onPointerMove = (slot: number) => (e: React.PointerEvent) => {
    if (dragging !== slot || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition(team, setterPos, slot, { x, y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[4/3] rounded-lg border border-white/20 overflow-hidden touch-none select-none"
      style={{ background: 'hsl(28 70% 55%)', boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)' }}
    >
      {/* Rete in alto */}
      <div className="absolute top-0 inset-x-0 h-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
      <span className="absolute top-1.5 left-2 text-[9px] font-black uppercase tracking-widest text-white/70">RETE</span>
      <span className={`absolute top-1.5 right-2 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
        mode === 'reception' ? 'bg-blue-700 text-white' : 'bg-primary text-primary-foreground'
      }`}>
        {mode === 'reception' ? '↙ RIC' : '↗ ATT'}
      </span>
      {/* Linea 3m */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-white/45" />
      {/* Linee zone */}
      <div className="absolute inset-y-0 left-1/3 w-px bg-white/30 border-dashed" />
      <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />

      {[1, 2, 3, 4, 5, 6].map((slot) => {
        const coord = slots[slot as 1|2|3|4|5|6];
        const playerNum = lineup[slot - 1];
        const player = playerNum ? teamData.players.find((p) => p.number === playerNum) : null;
        const isSetter = slot === setterPos;
        const isLibero = player?.isLibero || player?.role === 'L';
        return (
          <div
            key={slot}
            onPointerDown={onPointerDown(slot)}
            onPointerMove={onPointerMove(slot)}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing ${dragging === slot ? 'scale-110' : ''}`}
            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
          >
            <span className="mb-0.5 text-[9px] font-black tracking-wider text-white/80">P{slot}</span>
            <div className={`relative flex size-9 items-center justify-center rounded-full text-xs font-black text-white shadow-lg ring-2 ring-white/60 ${
              isSetter ? 'bg-warning ring-warning' :
              isLibero ? 'bg-yellow-700 border-2 border-yellow-400' :
              team === 'home' ? 'bg-blue-700' : 'bg-red-700'
            }`}>
              {playerNum || '?'}
            </div>
            {player && (
              <span className="mt-0.5 max-w-14 truncate text-[9px] font-bold text-white/95 drop-shadow">
                {player.lastName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReceptionFormationEditor({ open, onOpenChange }: Props) {
  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [setterPos, setSetterPos] = useState<1|2|3|4|5|6>(1);
  const [editorMode, setEditorMode] = useState<EditorMode>('reception');
  const homeTeam = useMatchStore((s) => s.homeTeam);
  const awayTeam = useMatchStore((s) => s.awayTeam);
  const reset = useMatchStore((s) => s.resetReceptionFormations);
  const resetAttack = useMatchStore((s) => s.resetAttackFormations);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            {editorMode === 'reception' ? 'Schemi di ricezione 5-1' : 'Schemi di attacco 5-1'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Selettore squadra */}
          <div className="flex gap-2">
            <button
              onClick={() => setTeam('home')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                team === 'home'
                  ? 'bg-blue-700 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {homeTeam.name || 'Casa'}
            </button>
            <button
              onClick={() => setTeam('away')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                team === 'away'
                  ? 'bg-red-700 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {awayTeam.name || 'Ospite'}
            </button>
          </div>

          {/* Tab Ricezione / Attacco */}
          <div className="flex gap-1 p-1 rounded-lg bg-secondary">
            <button
              onClick={() => setEditorMode('reception')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                editorMode === 'reception'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ↙ Ricezione
            </button>
            <button
              onClick={() => setEditorMode('attack')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                editorMode === 'attack'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ↗ Attacco
            </button>
          </div>

          {/* Selettore rotazione */}
          <div className="grid grid-cols-6 gap-1">
            {SETTER_ROTATIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setSetterPos(r.value)}
                className={`px-2 py-1.5 rounded-md text-xs font-black transition-all ${
                  setterPos === r.value
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                title={r.desc}
              >
                {r.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground italic">
            {SETTER_ROTATIONS.find((r) => r.value === setterPos)?.desc}.
            {editorMode === 'reception'
              ? ' Trascina per modificare la formazione di ricezione. La rete è in alto.'
              : ' Trascina per modificare le posizioni di attacco dopo l\'alzata. Setter a rete, opposta e bande in posizione d\'attacco.'}
          </p>

          <FormationCanvas team={team} setterPos={setterPos} mode={editorMode} />

          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (editorMode === 'reception') {
                  reset(team);
                  toast.success('Formazioni ricezione ripristinate ai default 5-1');
                } else {
                  resetAttack(team);
                  toast.success('Formazioni attacco ripristinate ai default 5-1');
                }
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Ripristina default
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Fatto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

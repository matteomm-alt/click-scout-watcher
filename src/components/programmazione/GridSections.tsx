import { useState } from 'react';
import {
  Plus, Trash2, Download, X, Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import { safeUUID } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { AtletaBlock, GridBlock, GridData, Phase, Athlete, SkeletonRow, FondColor, startOfWeek, addDays, fmtDate, weeksInPhase, initials, PointsSection, FundamentalSelect, DAYS } from '@/components/programmazione/shared';

/* ------------------------------------------------------------------ */
/* Individual section                                                 */
/* ------------------------------------------------------------------ */

export function IndividualSection({
  phase, athletes, onChange,
}: { phase: Phase; athletes: Athlete[]; onChange: (v: AtletaBlock[]) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const available = athletes.filter(a => !phase.tecnica_individuale.some(x => x.atleta_id === a.id));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wide">Tecnica individuale</p>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Aggiungi atleta</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2 max-h-72 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">Tutti gli atleti sono già inseriti.</p>
            ) : available.map(a => (
              <button
                key={a.id} type="button"
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                onClick={() => {
                  onChange([...phase.tecnica_individuale, {
                    id: safeUUID(), atleta_id: a.id,
                    atleta_nome: `${a.first_name ?? ''} ${a.last_name}`.trim(),
                    ruolo: a.role ?? '', punti: [],
                  }]);
                  setAddOpen(false);
                }}
              >
                <span className="font-medium">{a.first_name} {a.last_name}</span>
                {a.role && <span className="text-muted-foreground text-xs"> · {a.role}</span>}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {phase.tecnica_individuale.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-4 border border-dashed rounded">
          Nessun atleta assegnato.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {phase.tecnica_individuale.map((a, idx) => (
          <Card key={a.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 text-orange-800 dark:text-primary flex items-center justify-center font-bold text-xs">
                {initials(a.atleta_nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{a.atleta_nome}</p>
                {a.ruolo && <Badge variant="outline" className="text-xs">{a.ruolo}</Badge>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => onChange(phase.tecnica_individuale.filter(x => x.id !== a.id))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <PointsSection
              title="Punti"
              items={a.punti}
              onChange={(pts) => {
                const next = phase.tecnica_individuale.slice();
                next[idx] = { ...a, punti: pts };
                onChange(next);
              }}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grid editor                                                        */
/* ------------------------------------------------------------------ */

export function GridEditor({
  phase, skeletons, allFundamentals, colorFor, onAddCustom, onChange, weekOffset,
}: {
  phase: Phase;
  skeletons: SkeletonRow[];
  allFundamentals: string[];
  colorFor: (n: string) => FondColor;
  onAddCustom: (name: string, bg: string, fg: string) => void;
  onChange: (gd: GridData) => void;
  weekOffset: number;
}) {
  const totalWeeks = weeksInPhase(phase);
  const start = phase.start_date ? startOfWeek(new Date(phase.start_date)) : startOfWeek(new Date());
  const visible = Math.min(6, totalWeeks - weekOffset);

  const setCell = (w: number, d: number, blocks: GridBlock[]) => {
    const gd = { ...(phase.grid_data ?? {}) };
    const week = { ...(gd[String(w)] ?? {}) };
    if (blocks.length === 0) delete week[String(d)]; else week[String(d)] = blocks;
    if (Object.keys(week).length === 0) delete gd[String(w)]; else gd[String(w)] = week;
    onChange(gd);
  };

  const [importOpen, setImportOpen] = useState<null | number>(null); // week index
  const [importSkelId, setImportSkelId] = useState<string>('');
  const [importKeepColors, setImportKeepColors] = useState(true);

  const doImport = (weekIdx: number) => {
    const sk = skeletons.find(s => s.id === importSkelId);
    if (!sk) { toast.error('Seleziona uno scheletro'); return; }
    const gd = { ...(phase.grid_data ?? {}) };
    const week = { ...(gd[String(weekIdx)] ?? {}) };
    // Nuovo formato: blocks.settimane[w].sedute[{giorno, blocchi[{nome, fondamentali[], minuti}]}]
    const settimane = ((sk.blocks?.settimane ?? []) as unknown[]) as {
      sedute?: { giorno?: number | null; blocchi?: { nome?: string; fondamentali?: string[]; minuti?: number | string }[] }[];
    }[];
    let imported = 0;
    if (settimane.length > 0) {
      const sett = settimane[weekIdx % settimane.length];
      (sett?.sedute ?? []).forEach((sed) => {
        if (sed.giorno === null || sed.giorno === undefined || sed.giorno < 0 || sed.giorno > 6) return;
        const blocks: GridBlock[] = (sed.blocchi ?? []).flatMap((b) => {
          const fs = b.fondamentali?.length ? b.fondamentali : ['Situazionale'];
          const note = [b.nome, b.minuti ? `${b.minuti}'` : ''].filter(Boolean).join(' · ') || undefined;
          return fs.map((f) => ({ id: safeUUID(), fundamental: f, note }));
        });
        if (blocks.length > 0) {
          week[String(sed.giorno)] = [...(week[String(sed.giorno)] ?? []), ...blocks];
          imported += blocks.length;
        }
      });
    } else {
      // Formato legacy: schedule { [day]: [{fundamental, note}] }
      const sched = (sk.schedule ?? {}) as Record<string, unknown>;
      for (let d = 0; d < 7; d++) {
        const raw = (sched[String(d)] ?? sched[DAYS[d]] ?? []) as unknown;
        if (!Array.isArray(raw)) continue;
        const blocks: GridBlock[] = raw.map((r) => {
          const rec = (r ?? {}) as Record<string, unknown>;
          const f = String(rec.fundamental ?? rec.name ?? rec.title ?? 'Situazionale');
          const n = rec.note ? String(rec.note) : undefined;
          return { id: safeUUID(), fundamental: f, note: n };
        });
        if (blocks.length > 0) {
          week[String(d)] = [...(week[String(d)] ?? []), ...blocks];
          imported += blocks.length;
        }
      }
    }
    if (imported === 0) { toast.error('Lo scheletro non ha sedute con giorno e blocchi da importare'); return; }
    gd[String(weekIdx)] = week;
    onChange(gd);
    setImportOpen(null); setImportSkelId('');
    toast.success(`Scheletro importato (${imported} blocchi)`);
    void importKeepColors;
  };

  return (
    <Card className="p-4 overflow-x-auto prog-print">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[88px_repeat(7,1fr)] gap-1 mb-1 text-xs uppercase font-bold text-muted-foreground">
          <div />
          {DAYS.map(d => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        {Array.from({ length: Math.max(1, visible) }).map((_, i) => {
          const w = weekOffset + i;
          if (w >= totalWeeks) return null;
          const weekStart = addDays(start, w * 7);
          const weekEnd = addDays(weekStart, 6);
          return (
            <div key={w} className="grid grid-cols-[88px_repeat(7,1fr)] gap-1 mb-1 group">
              <div className="text-xs p-2 border border-border rounded bg-muted/30 relative">
                <p className="font-bold">S{w + 1}</p>
                <p className="text-muted-foreground">{fmtDate(weekStart)}–{fmtDate(weekEnd)}</p>
                <button
                  type="button"
                  onClick={() => setImportOpen(w)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/70"
                  title="Importa scheletro"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
              {DAYS.map((_, d) => {
                const blocks = phase.grid_data?.[String(w)]?.[String(d)] ?? [];
                return (
                  <div key={d} className="grid-cell border border-border rounded p-1 min-h-[80px] space-y-1 bg-card">
                    {blocks.map((b) => (
                      <BlockChip
                        key={b.id}
                        block={b}
                        color={colorFor(b.fundamental)}
                        allFundamentals={allFundamentals}
                        onAddCustom={onAddCustom}
                        onChange={(next) => setCell(w, d, blocks.map(x => x.id === b.id ? next : x))}
                        onDuplicate={() => setCell(w, d, [...blocks, { ...b, id: safeUUID() }])}
                        onDelete={() => setCell(w, d, blocks.filter(x => x.id !== b.id))}
                      />
                    ))}
                    <AddBlockButton
                      allFundamentals={allFundamentals}
                      onAddCustom={onAddCustom}
                      onAdd={(f) => setCell(w, d, [...blocks, { id: safeUUID(), fundamental: f }])}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Dialog open={importOpen !== null} onOpenChange={(o) => { if (!o) setImportOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importa scheletro nella settimana</DialogTitle>
            <DialogDescription>I blocchi saranno aggiunti ai giorni della settimana selezionata.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={importSkelId} onValueChange={setImportSkelId}>
              <SelectTrigger><SelectValue placeholder="Scegli scheletro..." /></SelectTrigger>
              <SelectContent>
                {skeletons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={importKeepColors} onChange={() => setImportKeepColors(true)} />
                Mantieni colori originali
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={!importKeepColors} onChange={() => setImportKeepColors(false)} />
                Adatta al tema
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(null)}>Annulla</Button>
            <Button onClick={() => importOpen !== null && doImport(importOpen)}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function BlockChip({
  block, color, allFundamentals, onAddCustom, onChange, onDuplicate, onDelete,
}: {
  block: GridBlock; color: FondColor;
  allFundamentals: string[];
  onAddCustom: (n: string, bg: string, fg: string) => void;
  onChange: (b: GridBlock) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid-block w-full text-left px-2 py-1 rounded text-xs font-semibold truncate"
          style={{ backgroundColor: color.sfondo, color: color.testo }}
          title={block.note ?? block.fundamental}
        >
          {block.fundamental}{block.note ? ' •' : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <FundamentalSelect
          value={block.fundamental}
          onChange={(v) => onChange({ ...block, fundamental: v })}
          allFundamentals={allFundamentals}
          onAddCustom={onAddCustom}
        />
        <Textarea
          placeholder="Nota (es. focus zona 1-5)"
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value || undefined })}
          rows={2}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDuplicate} className="flex-1">
            <Copy className="w-3 h-3 mr-1" /> Duplica
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} className="flex-1">
            <Trash2 className="w-3 h-3 mr-1" /> Elimina
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AddBlockButton({
  allFundamentals, onAddCustom, onAdd,
}: {
  allFundamentals: string[];
  onAddCustom: (n: string, bg: string, fg: string) => void;
  onAdd: (fundamental: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-xs text-muted-foreground border border-dashed border-border rounded py-0.5 hover:bg-muted/40 hover:text-foreground"
        >
          + blocco
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <FundamentalSelect
          value=""
          onChange={(v) => { onAdd(v); setOpen(false); }}
          allFundamentals={allFundamentals}
          onAddCustom={onAddCustom}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.padEnd(6, '0');
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}


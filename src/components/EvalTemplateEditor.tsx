import { useRef, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, RotateCcw, Download, Upload, Check, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FONDAMENTALI_DEFAULT } from '@/lib/evalFondamentali';
import type { EvalTemplate, CustomFundamental } from '@/hooks/useEvalTemplate';
import { useActiveSociety } from '@/hooks/useActiveSociety';

interface TemplateExportFile {
  version: 1;
  exportedAt: string;
  societyName: string | null;
  template: EvalTemplate;
}

function validateImportFile(obj: unknown): obj is TemplateExportFile {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.template !== 'object' || o.template === null) return false;
  const t = o.template as Record<string, unknown>;
  if (!Array.isArray(t.customFundamentals)) return false;
  if (typeof t.extraSubAspects !== 'object' || t.extraSubAspects === null) return false;
  return true;
}

function mergeTemplates(current: EvalTemplate, incoming: EvalTemplate): EvalTemplate {
  let visibleFundamentals = current.visibleFundamentals;
  if (incoming.visibleFundamentals !== null && current.visibleFundamentals !== null) {
    visibleFundamentals = Array.from(new Set([...current.visibleFundamentals, ...incoming.visibleFundamentals]));
  }
  const existingIds = new Set(current.customFundamentals.map(f => f.id));
  const newCustom = incoming.customFundamentals.filter(f => !existingIds.has(f.id));
  const customFundamentals = [...current.customFundamentals, ...newCustom];

  const extraSubAspects: Record<string, string[]> = { ...current.extraSubAspects };
  for (const [fondId, subs] of Object.entries(incoming.extraSubAspects)) {
    const existing = new Set(extraSubAspects[fondId] ?? []);
    const added = (subs as string[]).filter(s => !existing.has(s));
    if (added.length > 0) {
      extraSubAspects[fondId] = [...(extraSubAspects[fondId] ?? []), ...added];
    }
  }
  const renamedSubAspects: Record<string, string> = {
    ...(incoming.renamedSubAspects ?? {}),
    ...(current.renamedSubAspects ?? {}),
  };
  return { visibleFundamentals, customFundamentals, extraSubAspects, renamedSubAspects };
}

interface Props {
  template: EvalTemplate;
  saving: boolean;
  onSave: (patch: Partial<EvalTemplate>) => Promise<void>;
  onReset: () => Promise<void>;
}

interface CustomSubInputProps {
  fondId: string;
  onAdd: (fondId: string, text: string) => Promise<void>;
}
function CustomSubInput({ fondId, onAdd }: CustomSubInputProps) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd(fondId, val);
            setVal('');
          }
        }}
        placeholder="Aggiungi sub-aspetto..."
        className="h-8 text-xs bg-secondary/40"
      />
      <button
        type="button"
        onClick={() => { onAdd(fondId, val); setVal(''); }}
        disabled={!val.trim()}
        className="h-8 w-8 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function EvalTemplateEditor({ template, saving, onSave, onReset }: Props) {
  const { societyName } = useActiveSociety();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [newFondDialog, setNewFondDialog] = useState(false);
  const [newFondNome, setNewFondNome] = useState('');
  const [newFondSubs, setNewFondSubs] = useState('');
  const [newSubAspect, setNewSubAspect] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{ fondId: string; subIndex: number; currentValue: string } | null>(null);
  const [editingFond, setEditingFond] = useState<{ id: string; currentValue: string } | null>(null);

  const renameSubAspect = async (fondId: string, subIndex: number, newName: string) => {
    const trimmed = newName.trim();
    const key = `${fondId}_${subIndex}`;
    const defaultName = FONDAMENTALI_DEFAULT
      .find(f => f.id === fondId)?.subAspetti[subIndex] ?? '';
    const updated = { ...template.renamedSubAspects };
    if (!trimmed || trimmed === defaultName) {
      delete updated[key];
    } else {
      updated[key] = trimmed;
    }
    setEditingSub(null);
    await onSave({ renamedSubAspects: updated });
  };

  const renameFundamental = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    const defaultName = FONDAMENTALI_DEFAULT.find(f => f.id === id)?.nome ?? '';
    const updated = { ...template.renamedFundamentals };
    if (!trimmed || trimmed === defaultName) delete updated[id];
    else updated[id] = trimmed;
    setEditingFond(null);
    await onSave({ renamedFundamentals: updated });
  };

  const reorderFundamentals = async (newOrder: string[]) => {
    await onSave({ fundamentalsOrder: newOrder });
  };

  const orderedFonds = (
    template.fundamentalsOrder ??
    FONDAMENTALI_DEFAULT.map(f => f.id)
  )
    .map((id: string) => FONDAMENTALI_DEFAULT.find(f => f.id === id))
    .filter((f): f is (typeof FONDAMENTALI_DEFAULT)[number] => !!f);

  const [importPreview, setImportPreview] = useState<{
    file: TemplateExportFile;
    merged: EvalTemplate;
    newCustomCount: number;
    newSubCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('merge');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const isVisible = (id: string) =>
    template.visibleFundamentals === null || template.visibleFundamentals.includes(id);

  const toggleVisible = async (id: string) => {
    const allIds = FONDAMENTALI_DEFAULT.map(f => f.id);
    const current = template.visibleFundamentals ?? [...allIds];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    const normalized = next.length === allIds.length ? null : next;
    await onSave({ visibleFundamentals: normalized });
  };

  const addSubAspect = async (fondId: string) => {
    const text = (newSubAspect[fondId] ?? '').trim();
    if (!text) return;
    const current = template.extraSubAspects[fondId] ?? [];
    const fond = FONDAMENTALI_DEFAULT.find(f => f.id === fondId);
    if ([...(fond?.subAspetti ?? []), ...current].includes(text)) {
      toast.error('Sub-aspetto già presente');
      return;
    }
    await onSave({ extraSubAspects: { ...template.extraSubAspects, [fondId]: [...current, text] } });
    setNewSubAspect(prev => ({ ...prev, [fondId]: '' }));
  };

  const removeSubAspect = async (fondId: string, text: string) => {
    const next = (template.extraSubAspects[fondId] ?? []).filter(s => s !== text);
    const updated = { ...template.extraSubAspects };
    if (next.length === 0) delete updated[fondId]; else updated[fondId] = next;
    await onSave({ extraSubAspects: updated });
  };

  const addCustomFond = async () => {
    const nome = newFondNome.trim();
    if (!nome) return;
    const subs = newFondSubs.split('\n').map(s => s.trim()).filter(Boolean);
    const newFond: CustomFundamental = { id: `custom_${Date.now()}`, nome, subAspetti: subs };
    await onSave({ customFundamentals: [...template.customFundamentals, newFond] });
    setNewFondNome(''); setNewFondSubs(''); setNewFondDialog(false);
    toast.success(`"${nome}" aggiunto`);
  };

  const removeCustomFond = async (id: string) => {
    await onSave({ customFundamentals: template.customFundamentals.filter(f => f.id !== id) });
  };

  const addSubToCustom = async (fondId: string, text: string) => {
    if (!text.trim()) return;
    const fond = template.customFundamentals.find(f => f.id === fondId);
    if (!fond || fond.subAspetti.includes(text.trim())) return;
    await onSave({
      customFundamentals: template.customFundamentals.map(f =>
        f.id === fondId ? { ...f, subAspetti: [...f.subAspetti, text.trim()] } : f
      ),
    });
  };

  const removeSubFromCustom = async (fondId: string, idx: number) => {
    await onSave({
      customFundamentals: template.customFundamentals.map(f =>
        f.id === fondId ? { ...f, subAspetti: f.subAspetti.filter((_, i) => i !== idx) } : f
      ),
    });
  };

  const handleExport = () => {
    const payload: TemplateExportFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      societyName: societyName ?? null,
      template,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const soc = (societyName ?? 'coach').toLowerCase().replace(/\s+/g, '_');
    a.href = url; a.download = `fondamentali_${soc}_${date}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Configurazione esportata');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!validateImportFile(parsed)) {
          toast.error('File non valido', { description: 'Usa un file esportato da questa app.' });
          return;
        }
        const merged = mergeTemplates(template, parsed.template);
        const existingIds = new Set(template.customFundamentals.map(f => f.id));
        const newCustomCount = parsed.template.customFundamentals.filter(
          (f: CustomFundamental) => !existingIds.has(f.id)
        ).length;
        let newSubCount = 0;
        for (const [fondId, subs] of Object.entries(parsed.template.extraSubAspects)) {
          const existing = new Set(template.extraSubAspects[fondId] ?? []);
          newSubCount += (subs as string[]).filter(s => !existing.has(s)).length;
        }
        setImportPreview({ file: parsed, merged, newCustomCount, newSubCount });
        setImportDialogOpen(true);
      } catch {
        toast.error('Errore lettura file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const toApply = importMode === 'overwrite' ? importPreview.file.template : importPreview.merged;
    await onSave(toApply);
    setImportDialogOpen(false); setImportPreview(null);
    toast.success(
      importMode === 'overwrite' ? 'Configurazione sostituita' : 'Configurazione unita',
      { description: 'Le valutazioni già inserite non sono state modificate.' }
    );
  };

  const visibleStandardCount = template.visibleFundamentals === null
    ? FONDAMENTALI_DEFAULT.length : template.visibleFundamentals.length;
  const totalActive = visibleStandardCount + template.customFundamentals.length;

  return (
    <>
      <div className="space-y-6">
        {/* Stats + Export/Import */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {totalActive} fondamentali attivi
            {saving && <span className="ml-2 text-primary normal-case">Salvataggio...</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors">
              <Download className="w-3.5 h-3.5" /> Esporta
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-colors"
              title="Importa JSON da un altro coach">
              <Upload className="w-3.5 h-3.5" /> Importa
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        {/* Standard */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fondamentali standard
          </p>
          <div className="space-y-2">
            {FONDAMENTALI_DEFAULT.map(f => {
              const visible = isVisible(f.id);
              const extras = template.extraSubAspects[f.id] ?? [];
              return (
                <div key={f.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className={`text-sm font-bold ${visible ? '' : 'text-muted-foreground line-through'}`}>{f.nome}</span>
                    <button type="button" onClick={() => toggleVisible(f.id)}
                      className={`p-1.5 rounded-md transition-colors ${visible ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-secondary'}`}
                      title={visible ? 'Nascondi' : 'Mostra'}>
                      {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  {visible && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {f.subAspetti.map((sa, i) => {
                          const key = `${f.id}_${i}`;
                          const displayName = template.renamedSubAspects[key] ?? sa;
                          const isRenamed = !!template.renamedSubAspects[key];
                          const isEditing = editingSub?.fondId === f.id && editingSub?.subIndex === i;

                          if (isEditing) {
                            return (
                              <Input
                                key={`std-${i}`}
                                autoFocus
                                defaultValue={editingSub!.currentValue}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') renameSubAspect(f.id, i, e.currentTarget.value);
                                  if (e.key === 'Escape') setEditingSub(null);
                                }}
                                onBlur={(e) => renameSubAspect(f.id, i, e.target.value)}
                                className="h-6 text-[10px] w-48 px-2"
                              />
                            );
                          }

                          return (
                            <Badge
                              key={`std-${i}`}
                              variant="secondary"
                              onClick={() => setEditingSub({ fondId: f.id, subIndex: i, currentValue: displayName })}
                              className={`text-[10px] font-normal cursor-pointer hover:bg-primary/10 ${isRenamed ? 'text-primary border-primary/40 border' : ''}`}
                              title={isRenamed ? `Originale: "${sa}" — clicca per modificare` : 'Clicca per rinominare'}
                            >
                              {displayName}
                              {isRenamed && <span className="ml-1 opacity-70">✎</span>}
                            </Badge>
                          );
                        })}
                        {extras.map((sa, i) => (
                          <Badge key={`ext-${i}`} variant="outline"
                            onClick={() => removeSubAspect(f.id, sa)}
                            className="text-[10px] font-normal border-primary/40 text-primary cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                            title="Clicca per rimuovere">
                            {sa} ×
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Clicca su un criterio per rinominarlo. I nomi modificati appaiono in arancio.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={newSubAspect[f.id] ?? ''}
                          onChange={e => setNewSubAspect(prev => ({ ...prev, [f.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubAspect(f.id); } }}
                          placeholder="Aggiungi sub-aspetto personalizzato..."
                          className="h-8 text-xs bg-secondary/40"
                        />
                        <button type="button" onClick={() => addSubAspect(f.id)}
                          disabled={!newSubAspect[f.id]?.trim()}
                          className="h-8 w-8 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fondamentali custom
            </p>
            <button type="button" onClick={() => setNewFondDialog(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80">
              <Plus className="w-3.5 h-3.5" /> Aggiungi fondamentale
            </button>
          </div>
          {template.customFundamentals.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-3 bg-secondary/30 rounded-lg border border-dashed border-border">
              Nessun fondamentale custom. Clicca "Aggiungi fondamentale" per crearne uno (es. "Situazioni di gioco", "Aspetti mentali").
            </p>
          ) : (
            <div className="space-y-2">
              {template.customFundamentals.map(f => (
                <div key={f.id} className="rounded-lg border border-primary/30 bg-card">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{f.nome}</span>
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Custom</Badge>
                    </div>
                    <button type="button" onClick={() => removeCustomFond(f.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {f.subAspetti.length === 0 && (
                        <span className="text-[11px] italic text-muted-foreground">Nessun sub-aspetto — valutazione con punteggio unico</span>
                      )}
                      {f.subAspetti.map((sa, i) => (
                        <Badge key={i} variant="outline"
                          onClick={() => removeSubFromCustom(f.id, i)}
                          className="text-[10px] font-normal cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40">
                          {sa} ×
                        </Badge>
                      ))}
                    </div>
                    <CustomSubInput fondId={f.id} onAdd={addSubToCustom} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setResetOpen(true)}
          className="w-full min-h-10 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" /> Ripristina configurazione default
        </button>
      </div>

      {/* Dialog nuovo custom */}
      <Dialog open={newFondDialog} onOpenChange={setNewFondDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo fondamentale custom</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Nome *</label>
              <Input value={newFondNome} onChange={e => setNewFondNome(e.target.value)}
                placeholder="es. Situazioni di gioco" autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Sub-aspetti (uno per riga — opzionali)
              </label>
              <textarea value={newFondSubs} onChange={e => setNewFondSubs(e.target.value)}
                placeholder={'Lettura 6 vs 6\nTransizione difesa-attacco\nComunicazione in campo'}
                rows={4}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setNewFondDialog(false); setNewFondNome(''); setNewFondSubs(''); }}>Annulla</Button>
            <Button onClick={addCustomFond} disabled={!newFondNome.trim()}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog import */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Importa configurazione</DialogTitle></DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/40 border border-border p-3 text-xs space-y-1">
                {importPreview.file.societyName && (
                  <div><span className="font-bold text-foreground">Società:</span> {importPreview.file.societyName}</div>
                )}
                <div><span className="font-bold text-foreground">Esportato il:</span> {new Date(importPreview.file.exportedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div><span className="font-bold text-foreground">Fondamentali custom nel file:</span> {importPreview.file.template.customFundamentals.length}</div>
                <div><span className="font-bold text-foreground">Sub-aspetti extra nel file:</span> {Object.values(importPreview.file.template.extraSubAspects).flat().length}</div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Modalità</p>
                <div className="space-y-2">
                  {[
                    { key: 'merge' as const, title: 'Unisci', desc: `Aggiunge ${importPreview.newCustomCount} fondamentali custom e ${importPreview.newSubCount} sub-aspetti non già presenti. La configurazione attuale viene mantenuta.`, color: 'primary' as const },
                    { key: 'overwrite' as const, title: 'Sostituisci', desc: 'Rimpiazza completamente la tua configurazione con quella del file. Le valutazioni già inserite non vengono cancellate.', color: 'destructive' as const },
                  ].map(opt => (
                    <button key={opt.key} type="button" onClick={() => setImportMode(opt.key)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        importMode === opt.key
                          ? opt.color === 'primary' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'
                          : 'border-border bg-secondary/30 hover:border-primary/40'
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        importMode === opt.key
                          ? opt.color === 'primary' ? 'border-primary' : 'border-destructive'
                          : 'border-muted-foreground'
                      }`}>
                        {importMode === opt.key && (
                          <div className={`w-2 h-2 rounded-full ${opt.color === 'primary' ? 'bg-primary' : 'bg-destructive'}`} />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{opt.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setImportDialogOpen(false); setImportPreview(null); }}>Annulla</Button>
            <Button onClick={confirmImport}
              className={importMode === 'overwrite' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {importMode === 'merge' ? 'Unisci' : 'Sostituisci'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare la configurazione default?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i fondamentali custom verranno eliminati e i fondamentali standard torneranno tutti visibili.
              Le valutazioni già inserite non vengono cancellate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { await onReset(); setResetOpen(false); toast.success('Configurazione ripristinata'); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

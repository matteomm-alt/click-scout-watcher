import { useState } from 'react';
import { Target, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { handleSupabaseError } from '@/lib/supabaseQuery';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AthleteObjective {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  aperto: 'border-l-yellow-500',
  in_corso: 'border-l-blue-500',
  completato: 'border-l-green-500',
};

export function AtletaObiettiviTab({ athleteId }: { athleteId: string }) {
  const { societyId } = useActiveSociety();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const key = ['athlete_objectives', athleteId];

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_objectives')
        .select('id, title, description, due_date, status, created_at')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });
      if (error) { handleSupabaseError(error, 'caricamento obiettivi'); return []; }
      return (data ?? []) as AthleteObjective[];
    },
    enabled: !!athleteId,
  });

  const reset = () => { setTitle(''); setDescription(''); setDueDate(''); setAdding(false); };

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) { toast.error('Inserisci un titolo per l\'obiettivo.'); return; }
    if (!societyId) { toast.error('Nessuna società attiva.'); return; }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) { setSaving(false); toast.error('Sessione scaduta, accedi di nuovo.'); return; }
    const { error } = await supabase.from('athlete_objectives').insert({
      athlete_id: athleteId,
      society_id: societyId,
      created_by: userId,
      title: t.slice(0, 160),
      description: description.trim().slice(0, 1000) || null,
      due_date: dueDate || null,
      status: 'aperto',
    });
    setSaving(false);
    if (error) { handleSupabaseError(error, 'creazione obiettivo'); return; }
    toast.success('Obiettivo aggiunto');
    reset();
    qc.invalidateQueries({ queryKey: key });
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('athlete_objectives').update({ status }).eq('id', id);
    if (error) { handleSupabaseError(error, 'aggiornamento obiettivo'); return; }
    qc.invalidateQueries({ queryKey: key });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('athlete_objectives').delete().eq('id', id);
    if (error) { handleSupabaseError(error, 'eliminazione obiettivo'); return; }
    toast.success('Obiettivo eliminato');
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Obiettivi individuali dell'atleta
        </p>
        {!adding && (
          <Button size="sm" className="gap-2" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Nuovo obiettivo
          </Button>
        )}
      </div>

      {adding && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Titolo (es. Migliorare la battuta flottante)"
            value={title} maxLength={160}
            onChange={e => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Descrizione / indicazioni tecniche"
            value={description} maxLength={1000} rows={3}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Scadenza</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-44" />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={reset} disabled={saving}>Annulla</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Caricamento…</Card>
      ) : objectives.length === 0 ? (
        <Card className="p-10 text-center">
          <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nessun obiettivo individuale.</p>
        </Card>
      ) : (
        objectives.map(o => (
          <Card
            key={o.id}
            className={`p-4 border-l-4 ${STATUS_STYLE[o.status] ?? 'border-l-muted'}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{o.title}</p>
                {o.description && (
                  <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground">{o.description}</p>
                )}
                {o.due_date && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Scadenza: {new Date(o.due_date).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 rounded-md text-[11px]"
                >
                  {o.status.replace('_', ' ')}
                </Badge>
                {o.status !== 'completato' ? (
                  <Button variant="ghost" size="icon" title="Segna come completato"
                    onClick={() => setStatus(o.id, 'completato')}>
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Riapri"
                    onClick={() => setStatus(o.id, 'in_corso')}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Elimina" onClick={() => remove(o.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

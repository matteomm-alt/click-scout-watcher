import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { toast } from 'sonner';
import {
  AthleteInjury,
  BODY_PARTS,
  INJURY_TYPES,
  InjurySeverity,
  InjuryStatus,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from '@/lib/injuries';

interface AthleteOption {
  id: string;
  last_name: string;
  first_name: string | null;
  number: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Se passato, l'atleta è bloccato; altrimenti viene mostrato il selettore. */
  athleteId?: string;
  /** Lista di atleti tra cui scegliere (usata quando athleteId è omesso). */
  athletes?: AthleteOption[];
  /** Infortunio esistente da modificare. Se null/undefined → creazione. */
  injury?: AthleteInjury | null;
  onSaved: () => void;
}

const empty = {
  athlete_id: '',
  body_part: '',
  injury_type: '',
  severity: 'lieve' as InjurySeverity,
  status: 'attivo' as InjuryStatus,
  start_date: new Date().toISOString().slice(0, 10),
  expected_return_date: '',
  actual_return_date: '',
  doctor_notes: '',
  notes: '',
};

export function InjuryFormDialog({
  open, onOpenChange, athleteId, athletes, injury, onSaved,
}: Props) {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (injury) {
      setForm({
        athlete_id: injury.athlete_id,
        body_part: injury.body_part,
        injury_type: injury.injury_type ?? '',
        severity: injury.severity,
        status: injury.status,
        start_date: injury.start_date,
        expected_return_date: injury.expected_return_date ?? '',
        actual_return_date: injury.actual_return_date ?? '',
        doctor_notes: injury.doctor_notes ?? '',
        notes: injury.notes ?? '',
      });
    } else {
      setForm({ ...empty, athlete_id: athleteId ?? '' });
    }
  }, [open, injury, athleteId]);

  const save = async () => {
    if (!societyId || !user) return;
    const targetAthlete = form.athlete_id || athleteId;
    if (!targetAthlete) {
      toast.error('Seleziona un atleta');
      return;
    }
    if (!form.body_part) {
      toast.error('Seleziona la parte del corpo');
      return;
    }

    // Se l'utente segna "risolto" senza data effettiva, la imposto a oggi.
    let actual = form.actual_return_date || null;
    if (form.status === 'risolto' && !actual) {
      actual = new Date().toISOString().slice(0, 10);
    }

    const payload = {
      society_id: societyId,
      athlete_id: targetAthlete,
      recorded_by: user.id,
      body_part: form.body_part,
      injury_type: form.injury_type || null,
      severity: form.severity,
      status: form.status,
      start_date: form.start_date,
      expected_return_date: form.expected_return_date || null,
      actual_return_date: actual,
      doctor_notes: form.doctor_notes || null,
      notes: form.notes || null,
    };

    setSaving(true);
    const { error } = injury
      ? await supabase.from('athlete_injuries').update(payload).eq('id', injury.id)
      : await supabase.from('athlete_injuries').insert(payload);
    setSaving(false);

    if (error) {
      console.error(error);
      toast.error('Errore salvataggio infortunio');
      return;
    }
    toast.success(injury ? 'Infortunio aggiornato' : 'Infortunio registrato');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{injury ? 'Modifica infortunio' : 'Nuovo infortunio'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!athleteId && (
            <div>
              <Label>Atleta *</Label>
              <Select value={form.athlete_id} onValueChange={(v) => setForm((f) => ({ ...f, athlete_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona atleta..." /></SelectTrigger>
                <SelectContent>
                  {(athletes ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      #{a.number ?? '—'} {a.last_name}{a.first_name ? ` ${a.first_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Parte del corpo *</Label>
              <Select value={form.body_part} onValueChange={(v) => setForm((f) => ({ ...f, body_part: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {BODY_PARTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo infortunio</Label>
              <Select value={form.injury_type} onValueChange={(v) => setForm((f) => ({ ...f, injury_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {INJURY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Gravità</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as InjurySeverity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SEVERITY_LABEL) as InjurySeverity[]).map((s) =>
                    <SelectItem key={s} value={s}>{SEVERITY_LABEL[s]}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as InjuryStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as InjuryStatus[]).map((s) =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Data inizio *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Rientro previsto</Label>
              <Input type="date" value={form.expected_return_date} onChange={(e) => setForm((f) => ({ ...f, expected_return_date: e.target.value }))} />
            </div>
            <div>
              <Label>Rientro effettivo</Label>
              <Input type="date" value={form.actual_return_date} onChange={(e) => setForm((f) => ({ ...f, actual_return_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Note medico</Label>
            <Textarea rows={2} value={form.doctor_notes} onChange={(e) => setForm((f) => ({ ...f, doctor_notes: e.target.value }))} placeholder="Diagnosi, indicazioni terapeutiche..." />
          </div>

          <div>
            <Label>Note coach</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Considerazioni sul recupero, modifiche al carico..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={saving}>{injury ? 'Salva' : 'Registra'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { ClipboardCheck, Check, X, AlertCircle, HeartPulse } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { toast } from 'sonner';

interface Event { id: string; title: string; start_at: string; event_type: string; }
interface Athlete { id: string; last_name: string; first_name: string | null; number: number | null; role: string | null; }
interface Attendance { athlete_id: string; status: 'presente' | 'assente' | 'giustificato'; note: string | null; }

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  presente: 'default', assente: 'destructive', giustificato: 'secondary',
};

export function PresenzeView() {
  const { user } = useAuth();
  const { societyId, features } = useActiveSociety();
  const injuriesEnabled = isFeatureEnabled(features, 'injuries');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [injuredIds, setInjuredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const { data } = await supabase.from('events').select('id, title, start_at, event_type')
        .eq('society_id', societyId).order('start_at', { ascending: false }).limit(30);
      const list = (data as any) || [];
      setEvents(list);
      if (list.length > 0) setSelectedEventId(list[0].id);
    })();
  }, [societyId]);

  useEffect(() => {
    if (!societyId) return;
    (async () => {
      const { data } = await supabase.from('athletes').select('id, last_name, first_name, number, role')
        .eq('society_id', societyId).order('last_name');
      setAthletes((data as any) || []);
      if (injuriesEnabled) {
        const { data: inj } = await supabase
          .from('athlete_injuries')
          .select('athlete_id')
          .eq('society_id', societyId)
          .eq('status', 'attivo');
        setInjuredIds(new Set(((inj as any) || []).map((r: { athlete_id: string }) => r.athlete_id)));
      }
    })();
  }, [societyId, injuriesEnabled]);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('attendances').select('athlete_id, status, note').eq('event_id', selectedEventId);
      const map: Record<string, Attendance> = {};
      for (const a of (data as any) || []) map[a.athlete_id] = a;
      setAttendances(map);
      setLoading(false);
    })();
  }, [selectedEventId]);

  const setStatus = async (athleteId: string, status: 'presente' | 'assente' | 'giustificato') => {
    if (!selectedEventId || !user || !societyId) return;
    setSaving(athleteId);
    const existing = attendances[athleteId];
    const { error } = existing
      ? await supabase.from('attendances').update({ status }).eq('event_id', selectedEventId).eq('athlete_id', athleteId)
      : await supabase.from('attendances').insert({ event_id: selectedEventId, athlete_id: athleteId, society_id: societyId, status, recorded_by: user.id });
    if (error) { toast.error('Errore salvataggio'); }
    else { setAttendances(prev => ({ ...prev, [athleteId]: { athlete_id: athleteId, status, note: prev[athleteId]?.note || null } })); }
    setSaving(null);
  };

  const presenti = Object.values(attendances).filter(a => a.status === 'presente').length;
  const assenti = Object.values(attendances).filter(a => a.status === 'assente').length;
  const giustificati = Object.values(attendances).filter(a => a.status === 'giustificato').length;
  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Gestionale Società</p>
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-black italic uppercase leading-none">Presenze</h1>
        </div>
        <p className="text-muted-foreground">Registra presenze e assenze per ogni evento.</p>
      </div>

      <div className="max-w-lg">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger><SelectValue placeholder="Seleziona evento..." /></SelectTrigger>
          <SelectContent>
            {events.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {new Date(e.start_at).toLocaleDateString('it-IT')} — {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvent && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Presenti</p><p className="text-3xl font-black text-green-400">{presenti}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Assenti</p><p className="text-3xl font-black text-destructive">{assenti}</p></Card>
          <Card className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Giustificati</p><p className="text-3xl font-black text-muted-foreground">{giustificati}</p></Card>
        </div>
      )}

      {selectedEvent && (
        <Card className="overflow-hidden">
          {loading ? <div className="p-8 text-center text-muted-foreground">Caricamento...</div> :
           athletes.length === 0 ? <div className="p-8 text-center text-muted-foreground">Nessun atleta trovato.</div> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="text-left p-4">Atleta</th>
                  <th className="text-center p-4">Stato</th>
                  <th className="text-center p-4">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const status = attendances[a.id]?.status;
                  return (
                    <tr key={a.id} className="border-b border-border/40">
                      <td className="p-4">
                        <span className="font-bold">#{a.number || '—'}</span>
                        <span className="ml-2">{a.last_name}{a.first_name ? ` ${a.first_name.charAt(0)}.` : ''}</span>
                        {a.role && <span className="ml-2 text-xs text-muted-foreground">{a.role}</span>}
                      </td>
                      <td className="p-4 text-center">
                        {status ? <Badge variant={STATUS_VARIANT[status]}>{status}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="icon" variant={status === 'presente' ? 'default' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'presente')}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant={status === 'assente' ? 'destructive' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'assente')}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant={status === 'giustificato' ? 'secondary' : 'outline'} className="h-8 w-8" disabled={saving === a.id} onClick={() => setStatus(a.id, 'giustificato')}>
                            <AlertCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/queryKeys';
import { deadlineStatus, daysUntil, type AthleteAdminData, type DeadlineStatus } from '@/lib/athleteDeadlines';

// La tabella athlete_admin_data non e' ancora nei tipi generati: accesso non tipizzato.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

type FormState = Omit<AthleteAdminData, 'athlete_id' | 'society_id'> & { medical_cert_expiry: string | null };

const EMPTY: FormState = {
  tax_code: null, birth_place: null, address: null,
  guardian_name: null, guardian_phone: null, guardian_email: null,
  federation_card_number: null, federation_card_expiry: null,
  insurance_expiry: null, enrollment_renewal_date: null, admin_notes: null,
  medical_cert_expiry: null,
};

export function StatusBadge({ status, days }: { status: DeadlineStatus; days: number | null }) {
  if (status === 'mancante') return <Badge variant="outline" className="text-muted-foreground">Mancante</Badge>;
  if (status === 'scaduto') return <Badge variant="destructive">Scaduto da {Math.abs(days ?? 0)} gg</Badge>;
  if (status === 'in_scadenza') return <Badge className="bg-warning text-warning-foreground">Scade tra {days} gg</Badge>;
  return <Badge className="bg-success text-success-foreground">Regolare</Badge>;
}

interface Props { athleteId: string; medicalCertExpiry: string | null; active: boolean }

export function AtletaAmministrazioneTab({ athleteId, medicalCertExpiry, active }: Props) {
  const { societyId } = useActiveSociety();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['athlete-admin', athleteId],
    enabled: active && !!athleteId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as SbAny)
        .from('athlete_admin_data').select('*').eq('athlete_id', athleteId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as AthleteAdminData | null;
    },
  });

  useEffect(() => {
    if (isLoading) return;
    setForm({
      ...EMPTY,
      ...(data ? {
        tax_code: data.tax_code, birth_place: data.birth_place, address: data.address,
        guardian_name: data.guardian_name, guardian_phone: data.guardian_phone, guardian_email: data.guardian_email,
        federation_card_number: data.federation_card_number, federation_card_expiry: data.federation_card_expiry,
        insurance_expiry: data.insurance_expiry, enrollment_renewal_date: data.enrollment_renewal_date,
        admin_notes: data.admin_notes,
      } : {}),
      medical_cert_expiry: medicalCertExpiry,
    });
  }, [data, isLoading, medicalCertExpiry]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value || null }));

  if (error) {
    return (
      <Card className="p-6 flex gap-3 items-start">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Dati amministrativi non disponibili</p>
          <p className="text-muted-foreground">
            Questa scheda è riservata agli amministratori della società. Se sei amministratore e vedi
            questo messaggio, la tabella dei dati amministrativi non è ancora stata creata nel database.
          </p>
        </div>
      </Card>
    );
  }
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const save = async () => {
    if (!societyId) return;
    setSaving(true);
    try {
      const { medical_cert_expiry, ...adminFields } = form;
      const { error: e1 } = await (supabase as SbAny).from('athlete_admin_data')
        .upsert({ athlete_id: athleteId, society_id: societyId, ...adminFields }, { onConflict: 'athlete_id' });
      if (e1) throw e1;
      if (medical_cert_expiry !== medicalCertExpiry) {
        const { error: e2 } = await supabase.from('athletes')
          .update({ medical_cert_expiry: medical_cert_expiry || null }).eq('id', athleteId);
        if (e2) throw e2;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['athlete-admin'] }),
        qc.invalidateQueries({ queryKey: ['scadenze'] }),
        qc.invalidateQueries({ queryKey: queryKeys.athletes.detail(athleteId) }),
      ]);
      toast.success('Dati amministrativi salvati');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  };

  const dateField = (label: string, key: 'medical_cert_expiry' | 'federation_card_expiry' | 'insurance_expiry' | 'enrollment_renewal_date') => {
    const v = form[key];
    const st = deadlineStatus(v);
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" className="w-44" value={v ?? ''} onChange={set(key)} />
          <StatusBadge status={st} days={v ? daysUntil(v) : null} />
        </div>
      </div>
    );
  };

  const text = (label: string, key: keyof FormState, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={(form[key] as string | null) ?? ''} onChange={set(key)} {...props} />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-bold">Scadenze</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {dateField('Scadenza certificato medico', 'medical_cert_expiry')}
          {dateField('Scadenza tessera federale', 'federation_card_expiry')}
          {dateField('Scadenza assicurazione', 'insurance_expiry')}
          {dateField('Rinnovo iscrizione', 'enrollment_renewal_date')}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-bold">Anagrafica</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('Codice fiscale', 'tax_code', { autoCapitalize: 'characters', maxLength: 16 })}
          {text('Luogo di nascita', 'birth_place')}
          {text('Numero tessera federale', 'federation_card_number')}
          {text('Indirizzo', 'address')}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-bold">Genitore o tutore</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {text('Nome e cognome', 'guardian_name')}
          {text('Telefono', 'guardian_phone', { type: 'tel', inputMode: 'tel' })}
          {text('Email', 'guardian_email', { type: 'email', inputMode: 'email' })}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Note amministrative</Label>
        <Textarea rows={3} value={form.admin_notes ?? ''} onChange={set('admin_notes')} />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
      </div>
    </div>
  );
}

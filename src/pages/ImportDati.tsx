import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { useCurrentSeason } from '@/hooks/useCurrentSeason';
import { cn } from '@/lib/utils';

type Kind = 'squadre' | 'atleti' | 'obiettivi' | 'scheletri' | 'eventi';

interface KindConfig {
  label: string;
  columns: string[];
  sample: Record<string, string | number>[];
  hint: string;
}

const CONFIG: Record<Kind, KindConfig> = {
  squadre: {
    label: 'Squadre',
    columns: ['Nome', 'Categoria', 'Fascia', 'Stagione', 'Note'],
    sample: [{ Nome: 'Under 16 F', Categoria: 'Femminile', Fascia: 'U16', Stagione: '2025/26', Note: '' }],
    hint: 'Solo "Nome" è obbligatorio. Se la stagione è vuota viene usata quella corrente.',
  },
  atleti: {
    label: 'Atleti',
    columns: ['Cognome', 'Nome', 'Ruolo', 'Numero', 'DataNascita', 'Telefono', 'Email', 'Squadra'],
    sample: [{
      Cognome: 'Rossi', Nome: 'Giulia', Ruolo: 'Centrale', Numero: 7,
      DataNascita: '2008-04-12', Telefono: '', Email: '', Squadra: 'Under 16 F',
    }],
    hint: 'Solo "Cognome" è obbligatorio. "Squadra" deve corrispondere al nome di una squadra esistente.',
  },
  obiettivi: {
    label: 'Obiettivi',
    columns: ['Titolo', 'Descrizione', 'Ambito', 'DataObiettivo', 'Stato'],
    sample: [{
      Titolo: 'Migliorare la ricezione', Descrizione: 'Positività > 55%',
      Ambito: 'squadra', DataObiettivo: '2026-01-31', Stato: 'aperto',
    }],
    hint: 'Solo "Titolo" è obbligatorio. Ambito: squadra / individuale / società.',
  },
  scheletri: {
    label: 'Scheletri',
    columns: ['Nome', 'Descrizione', 'Settimane', 'Obiettivi', 'DurataMin', 'Squadra'],
    sample: [{
      Nome: 'Preparazione autunno', Descrizione: '3 sedute/settimana', Settimane: 4,
      Obiettivi: 'Forza + ricezione', DurataMin: 90, Squadra: 'Under 16 F',
    }],
    hint: 'Solo "Nome" è obbligatorio. Le sedute si aggiungono poi dalla pagina Scheletri.',
  },
  eventi: {
    label: 'Eventi',
    columns: ['Titolo', 'Tipo', 'Data', 'OraInizio', 'OraFine', 'Luogo', 'Squadra', 'Descrizione'],
    sample: [{
      Titolo: 'Allenamento settimanale', Tipo: 'allenamento', Data: '2025-10-14',
      OraInizio: '18:30', OraFine: '20:30', Luogo: 'Palestra Comunale',
      Squadra: 'Under 16 F', Descrizione: '',
    }],
    hint: 'Obbligatori "Titolo" e "Data" (formato AAAA-MM-GG). Tipo: allenamento / partita / riunione / torneo / altro. Se manca l\'orario si usa 18:00.',
  },
};

const VALID_EVENT_TYPES = ['allenamento', 'partita', 'riunione', 'torneo', 'altro'] as const;
type EventTypeValue = (typeof VALID_EVENT_TYPES)[number];

const timeOf = (v: unknown, fallback: string) => {
  const s = cell(v);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
};
const toIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

const VALID_ROLES = ['Palleggiatrice', 'Palleggiatore', 'Opposto', 'Schiacciatrice', 'Schiacciatore', 'Centrale', 'Libero', 'Universale'];

type Row = Record<string, unknown>;
interface PreviewRow { row: number; data: Row; error?: string }

const cell = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => {
  const s = cell(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};
const isoDate = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(cell(v)) ? cell(v) : null);

function validate(kind: Kind, raw: Row[]): PreviewRow[] {
  return raw.map((item, i) => {
    const errors: string[] = [];
    if (kind === 'squadre' && !cell(item.Nome)) errors.push('Nome mancante');
    if (kind === 'atleti' && !cell(item.Cognome)) errors.push('Cognome mancante');
    if (kind === 'obiettivi' && !cell(item.Titolo)) errors.push('Titolo mancante');
    if (kind === 'scheletri' && !cell(item.Nome)) errors.push('Nome mancante');
    if (kind === 'eventi') {
      if (!cell(item.Titolo)) errors.push('Titolo mancante');
      if (!isoDate(item.Data)) errors.push('Data mancante o non valida (AAAA-MM-GG)');
      const tipo = cell(item.Tipo).toLowerCase();
      if (tipo && !VALID_EVENT_TYPES.includes(tipo as EventTypeValue)) errors.push('Tipo non riconosciuto');
    }
    if (kind === 'atleti' && cell(item.Ruolo) && !VALID_ROLES.includes(cell(item.Ruolo))) {
      errors.push('Ruolo non riconosciuto');
    }
    return { row: i + 2, data: item, error: errors.join(', ') || undefined };
  });
}

export default function ImportDati() {
  const { user } = useAuth();
  const { societyId } = useActiveSociety();
  const { currentSeason } = useCurrentSeason();

  const [kind, setKind] = useState<Kind>('squadre');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const config = CONFIG[kind];
  const validRows = rows.filter((r) => !r.error);

  const reset = () => {
    setRows([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const switchKind = (k: Kind) => {
    setKind(k);
    reset();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
      setFileName(file.name);
      setRows(validate(kind, json));
      if (json.length === 0) toast.error('Il file non contiene righe');
    } catch (e) {
      toast.error('File non leggibile', { description: String(e) });
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(config.sample, { header: config.columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.label);
    XLSX.writeFile(wb, `modello-${kind}.xlsx`);
  };

  const resolveTeams = async () => {
    const map = new Map<string, string>();
    if (!societyId) return map;
    const { data } = await supabase.from('teams').select('id, name').eq('society_id', societyId);
    (data ?? []).forEach((t) => map.set(t.name.trim().toLowerCase(), t.id));
    return map;
  };

  const runImport = async () => {
    if (!societyId || !user) {
      toast.error('Società non disponibile');
      return;
    }
    setImporting(true);
    try {
      if (kind === 'squadre') {
        const payload = validRows.map((r) => ({
          society_id: societyId,
          coach_id: user.id,
          name: cell(r.data.Nome),
          category: cell(r.data.Categoria) || null,
          age_group: cell(r.data.Fascia) || null,
          season: cell(r.data.Stagione) || currentSeason,
          notes: cell(r.data.Note) || null,
        }));
        const { error } = await supabase.from('teams').insert(payload);
        if (error) throw error;
      }

      if (kind === 'atleti') {
        const teams = await resolveTeams();
        const payload = validRows.map((r) => {
          const teamId = teams.get(cell(r.data.Squadra).toLowerCase()) ?? null;
          const role = cell(r.data.Ruolo) || null;
          return {
            society_id: societyId,
            coach_id: user.id,
            last_name: cell(r.data.Cognome).toUpperCase(),
            first_name: cell(r.data.Nome) || null,
            role,
            is_libero: role === 'Libero',
            is_captain: false,
            number: num(r.data.Numero),
            birth_date: isoDate(r.data.DataNascita),
            phone: cell(r.data.Telefono) || null,
            email: cell(r.data.Email) || null,
            team_id: teamId,
            teams: teamId ? [teamId] : [],
          };
        });
        const { error } = await supabase.from('athletes').insert(payload);
        if (error) throw error;
      }

      if (kind === 'obiettivi') {
        const payload = validRows.map((r) => ({
          society_id: societyId,
          created_by: user.id,
          title: cell(r.data.Titolo),
          description: cell(r.data.Descrizione) || null,
          scope: cell(r.data.Ambito) || 'squadra',
          target_date: isoDate(r.data.DataObiettivo),
          status: cell(r.data.Stato) || 'aperto',
        }));
        const { error } = await supabase.from('objectives').insert(payload);
        if (error) throw error;
      }

      if (kind === 'scheletri') {
        const teams = await resolveTeams();
        const payload = validRows.map((r) => ({
          society_id: societyId,
          created_by: user.id,
          name: cell(r.data.Nome),
          description: cell(r.data.Descrizione) || null,
          weeks_count: num(r.data.Settimane) ?? 1,
          goals: cell(r.data.Obiettivi) || null,
          total_duration_min: num(r.data.DurataMin),
          team_id: teams.get(cell(r.data.Squadra).toLowerCase()) ?? null,
          blocks: [],
          schedule: [],
        }));
        const { error } = await supabase.from('training_skeletons').insert(payload);
        if (error) throw error;
      }

      if (kind === 'eventi') {
        const teams = await resolveTeams();
        const payload = validRows.map((r) => {
          const date = isoDate(r.data.Data) as string;
          const start = timeOf(r.data.OraInizio, '18:00');
          const endRaw = cell(r.data.OraFine);
          const tipo = cell(r.data.Tipo).toLowerCase();
          return {
            society_id: societyId,
            created_by: user.id,
            title: cell(r.data.Titolo),
            description: cell(r.data.Descrizione) || null,
            event_type: (VALID_EVENT_TYPES.includes(tipo as EventTypeValue) ? tipo : 'altro') as EventTypeValue,
            start_at: toIso(date, start),
            end_at: endRaw ? toIso(date, timeOf(endRaw, start)) : null,
            location: cell(r.data.Luogo) || null,
            team_id: teams.get(cell(r.data.Squadra).toLowerCase()) ?? null,
            season: currentSeason,
          };
        });
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }

      toast.success(`${validRows.length} righe importate in ${config.label}`);
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Import fallito', { description: msg });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold italic uppercase tracking-tight">Import Excel</h1>
        <p className="text-muted-foreground mt-1">
          Carica squadre, atleti, obiettivi e scheletri da un file .xlsx direttamente nel database.
        </p>
      </div>

      <Tabs value={kind} onValueChange={(v) => switchKind(v as Kind)}>
        <TabsList>
          {(Object.keys(CONFIG) as Kind[]).map((k) => (
            <TabsTrigger key={k} value={k}>{CONFIG[k].label}</TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(CONFIG) as Kind[]).map((k) => (
          <TabsContent key={k} value={k} className="space-y-4 pt-4">
            <div className="border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="font-bold uppercase tracking-wider">Colonne attese</span>
                <span className="text-muted-foreground">{CONFIG[k].columns.join(' · ')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{CONFIG[k].hint}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Scarica modello
                </Button>
                <Input
                  ref={kind === k ? fileRef : undefined}
                  type="file"
                  accept=".xlsx,.xls"
                  className="max-w-xs"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileName && <span className="text-xs text-muted-foreground">File: {fileName}</span>}
              </div>
            </div>

            {rows.length > 0 && (
              <>
                <div className="max-h-[420px] overflow-auto border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="p-2">Riga</th>
                        {CONFIG[k].columns.map((c) => <th key={c} className="p-2">{c}</th>)}
                        <th className="p-2">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.row} className="border-t border-border">
                          <td className="p-2 font-bold">{r.row}</td>
                          {CONFIG[k].columns.map((c) => (
                            <td key={c} className="p-2">{cell(r.data[c]) || '—'}</td>
                          ))}
                          <td className={cn('p-2 font-bold', r.error ? 'text-destructive' : 'text-primary')}>
                            {r.error || 'OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={reset} disabled={importing}>Pulisci</Button>
                  <Button onClick={runImport} disabled={importing || validRows.length === 0} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {importing ? 'Importazione…' : `Importa ${validRows.length} righe`}
                  </Button>
                  {rows.length !== validRows.length && (
                    <span className="text-xs text-destructive">
                      {rows.length - validRows.length} righe con errori verranno saltate
                    </span>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

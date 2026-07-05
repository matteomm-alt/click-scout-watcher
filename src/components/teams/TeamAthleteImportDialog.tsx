import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const VALID_ROLES = ['Palleggiatrice', 'Opposto', 'Schiacciatrice', 'Centrale', 'Libero', 'Universale'] as const;

export interface AthletePreviewRow {
  row: number;
  lastName: string;
  firstName: string;
  role: string;
  number: number | null;
  birthDate: string;
  phone: string;
  email: string;
  error?: string;
}

interface TeamAthleteImportDialogProps {
  teamId: string;
  teamName: string;
  onConfirm: (rows: AthletePreviewRow[]) => Promise<void>;
}

function normalizeCell(value: unknown) {
  return String(value ?? '').trim();
}

function parseRows(rows: Record<string, unknown>[]): AthletePreviewRow[] {
  return rows.map((item, index) => {
    const lastName = normalizeCell(item.Cognome);
    const firstName = normalizeCell(item.Nome);
    const roleRaw = normalizeCell(item.Ruolo);
    const numberRaw = normalizeCell(item.Numero);
    const birthDate = normalizeCell(item.DataNascita);
    const phone = normalizeCell(item.Telefono);
    const email = normalizeCell(item.Email);
    const errors: string[] = [];

    if (!lastName) errors.push('Cognome mancante');

    const role = (VALID_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : '';

    let numberVal: number | null = null;
    if (numberRaw) {
      const n = parseInt(numberRaw, 10);
      if (!Number.isNaN(n) && String(n) === numberRaw) numberVal = n;
    }

    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : '';

    return {
      row: index + 2,
      lastName,
      firstName,
      role,
      number: numberVal,
      birthDate: validDate,
      phone,
      email,
      error: errors.join(', ') || undefined,
    };
  });
}

export function TeamAthleteImportDialog({ teamId, teamName, onConfirm }: TeamAthleteImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AthletePreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const validRows = rows.filter((r) => !r.error);
  const hasErrors = rows.some((r) => r.error);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const XLSX = await import('xlsx');
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    setRows(parseRows(json));
  };

  const reset = () => {
    setRows([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirm = async () => {
    setImporting(true);
    try {
      await onConfirm(validRows);
      setOpen(false);
      reset();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title={`Importa giocatori in ${teamName}`}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="uppercase italic flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Importa giocatori da Excel
          </DialogTitle>
          <DialogDescription>
            Carica un file .xlsx con colonne Cognome, Nome, Ruolo, Numero, DataNascita, Telefono, Email per popolare la rosa di {teamName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border border-dashed border-border bg-muted/20 p-4">
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {fileName && <p className="mt-2 text-xs text-muted-foreground">File: {fileName}</p>}
          </div>

          {rows.length > 0 && (
            <div className="max-h-[360px] overflow-auto border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-2">Riga</th>
                    <th className="p-2">Cognome</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Ruolo</th>
                    <th className="p-2">Numero</th>
                    <th className="p-2">Data nascita</th>
                    <th className="p-2">Telefono</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.row} className="border-t border-border">
                      <td className="p-2 font-bold">{r.row}</td>
                      <td className="p-2 font-medium">{r.lastName || '—'}</td>
                      <td className="p-2">{r.firstName || '—'}</td>
                      <td className="p-2">{r.role || '—'}</td>
                      <td className="p-2">{r.number ?? '—'}</td>
                      <td className="p-2">{r.birthDate || '—'}</td>
                      <td className="p-2">{r.phone || '—'}</td>
                      <td className="p-2">{r.email || '—'}</td>
                      <td className={cn('p-2 font-bold', r.error ? 'text-destructive' : 'text-primary')}>
                        {r.error || 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={reset} disabled={importing}>
            Pulisci
          </Button>
          <Button onClick={confirm} disabled={importing || validRows.length === 0 || hasErrors} className="gap-2">
            <Upload className="h-4 w-4" />
            Conferma import ({validRows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload } from 'lucide-react';
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
import type { EventType } from '@/lib/eventTypes';
import { cn } from '@/lib/utils';

export interface ExcelEventPreview {
  row: number;
  start_at: string;
  event_type: EventType;
  title: string;
  location: string | null;
  error?: string;
}

interface ExcelImportDialogProps {
  onConfirm: (rows: ExcelEventPreview[]) => Promise<void>;
  disabled?: boolean;
}

const EVENT_VALUES: EventType[] = ['allenamento', 'partita', 'riunione', 'torneo', 'altro'];

function normalizeCell(value: unknown) {
  return String(value ?? '').trim();
}

function parseRows(rows: Record<string, unknown>[]): ExcelEventPreview[] {
  return rows.map((item, index) => {
    const date = normalizeCell(item.Data);
    const time = normalizeCell(item.Ora);
    const type = normalizeCell(item.Tipo).toLowerCase() as EventType;
    const title = normalizeCell(item.Titolo);
    const location = normalizeCell(item.Luogo);
    const errors: string[] = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('Data non valida');
    if (!/^\d{2}:\d{2}$/.test(time)) errors.push('Ora non valida');
    if (!EVENT_VALUES.includes(type)) errors.push('Tipo non valido');
    if (!title) errors.push('Titolo mancante');

    return {
      row: index + 2,
      start_at: date && time ? new Date(`${date}T${time}:00`).toISOString() : '',
      event_type: EVENT_VALUES.includes(type) ? type : 'altro',
      title,
      location: location || null,
      error: errors.join(', ') || undefined,
    };
  });
}

export function ExcelImportDialog({ onConfirm, disabled }: ExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ExcelEventPreview[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const validRows = rows.filter((row) => !row.error);
  const hasErrors = rows.some((row) => row.error);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
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
        <Button variant="outline" size="lg" className="gap-2" disabled={disabled}>
          <FileSpreadsheet className="h-4 w-4" />
          Importa da Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="uppercase italic">Importa eventi da Excel</DialogTitle>
          <DialogDescription>
            Carica un file .xlsx con colonne Data, Ora, Tipo, Titolo e Luogo.
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
                    <th className="p-2">Data/Ora</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Titolo</th>
                    <th className="p-2">Luogo</th>
                    <th className="p-2">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.row} className="border-t border-border">
                      <td className="p-2 font-bold">{row.row}</td>
                      <td className="p-2">{row.start_at ? new Date(row.start_at).toLocaleString('it-IT') : '—'}</td>
                      <td className="p-2 capitalize">{row.event_type}</td>
                      <td className="p-2 font-medium">{row.title || '—'}</td>
                      <td className="p-2">{row.location || '—'}</td>
                      <td className={cn('p-2 font-bold', row.error ? 'text-destructive' : 'text-primary')}>
                        {row.error || 'OK'}
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
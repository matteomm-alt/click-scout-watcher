import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Zap, FileSpreadsheet, SkipForward, FileUp, BarChart3, Calendar, Activity, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { parseDvw } from '@/lib/dvwImporter';
import * as XLSX from 'xlsx';

const CATEGORIES = ['U12', 'U14', 'U16', 'U18', 'Serie D', 'Serie C', 'Serie B', 'Serie A'];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || `societa-${Date.now()}`;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshRoles } = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [skippedStep1, setSkippedStep1] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('society_id')
        .eq('user_id', user.id)
        .not('society_id', 'is', null);
      if (data && data.length > 0) {
        setSkippedStep1(true);
        setStep((s) => (s === 1 ? 2 : s));
      }
    })();
  }, [user]);

  // Step 1
  const [teamName, setTeamName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [societyId, setSocietyId] = useState<string | null>(null);

  // Step 2/3 file pickers
  const xlsxRef = useRef<HTMLInputElement>(null);
  const dvwRef = useRef<HTMLInputElement>(null);

  // ---------- STEP 1 ----------
  const handleStep1 = async () => {
    if (!teamName.trim() || !category || !user) {
      toast.error('Compila nome squadra e categoria.');
      return;
    }
    setBusy(true);
    try {
      const baseSlug = slugify(teamName);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: soc, error: socErr } = await supabase
        .from('societies')
        .insert({
          name: teamName.trim(),
          slug,
          created_by: user.id,
          features: {
            athletes: true,
            exercises: true,
            dvw_export: true,
            guidelines: true,
            live_scout: true,
            advanced_stats: true,
            communications: true,
            video_analysis: false,
            training_calendar: true,
            injuries: true,
            category,
          } as never,
        })
        .select('id')
        .single();
      if (socErr) throw socErr;

      const { error: roleErr } = await supabase.from('user_roles').insert({
        user_id: user.id,
        society_id: soc.id,
        role: 'society_admin',
      });
      if (roleErr) throw roleErr;

      // Anche ruolo coach per accedere alle pagine coach
      await supabase.from('user_roles').insert({
        user_id: user.id,
        society_id: soc.id,
        role: 'coach',
      });

      setSocietyId(soc.id);
      await refreshRoles();
      toast.success(`Società "${teamName}" creata!`);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---------- STEP 2: rosa base ----------
  const generateRoster = async () => {
    if (!societyId || !user) return;
    setBusy(true);
    try {
      const template = [
        { number: 1, last_name: 'Giocatrice 1', role: 'S' },
        { number: 2, last_name: 'Giocatrice 2', role: 'OP' },
        { number: 3, last_name: 'Giocatrice 3', role: 'O' },
        { number: 4, last_name: 'Giocatrice 4', role: 'O' },
        { number: 5, last_name: 'Giocatrice 5', role: 'O' },
        { number: 6, last_name: 'Giocatrice 6', role: 'O' },
        { number: 7, last_name: 'Giocatrice 7', role: 'M' },
        { number: 8, last_name: 'Giocatrice 8', role: 'M' },
        { number: 9, last_name: 'Giocatrice 9', role: 'M' },
        { number: 10, last_name: 'Giocatrice 10', role: 'M' },
        { number: 11, last_name: 'Giocatrice 11', role: 'L', is_libero: true },
        { number: 12, last_name: 'Giocatrice 12', role: 'L', is_libero: true },
        { number: 13, last_name: 'Giocatrice 13', role: 'U' },
        { number: 14, last_name: 'Giocatrice 14', role: 'U' },
      ];
      const rows = template.map((p) => ({
        society_id: societyId,
        coach_id: user.id,
        number: p.number,
        last_name: p.last_name,
        first_name: '',
        role: p.role,
        is_libero: p.is_libero ?? false,
        is_captain: false,
        teams: [] as string[],
      }));
      const { error } = await supabase.from('athletes').insert(rows);
      if (error) throw error;
      toast.success('14 atlete create!');
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---------- STEP 2: import Excel ----------
  const handleXlsx = async (file: File) => {
    if (!societyId || !user) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const norm = (k: string) => k.toString().toLowerCase().trim();
      const pick = (row: Record<string, unknown>, candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.includes(norm(k))) return row[k];
        }
        return undefined;
      };

      const insert = rows
        .map((row) => {
          const number = Number(pick(row, ['numero', 'n', 'n°', 'num', 'number']) ?? 0);
          const last = String(pick(row, ['cognome', 'last_name', 'lastname', 'surname']) ?? '').trim();
          const first = String(pick(row, ['nome', 'first_name', 'firstname', 'name']) ?? '').trim();
          const role = String(pick(row, ['ruolo', 'role']) ?? 'O').toUpperCase().trim();
          if (!last) return null;
          const validRole = ['S', 'O', 'OP', 'M', 'L', 'U'].includes(role) ? role : 'O';
          return {
            society_id: societyId,
            coach_id: user.id,
            number: number || null,
            last_name: last.toUpperCase(),
            first_name: first,
            role: validRole,
            is_libero: validRole === 'L',
            is_captain: false,
            teams: [] as string[],
          };
        })
        .filter(Boolean);

      if (insert.length === 0) {
        toast.error('Nessuna riga valida trovata. Verifica le colonne (Cognome obbligatorio).');
        return;
      }
      const { error } = await supabase.from('athletes').insert(insert as never);
      if (error) throw error;
      toast.success(`${insert.length} atlete importate!`);
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore lettura file';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---------- STEP 3: import DVW ----------
  const handleDvw = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseDvw(text);
      // Salva solo metadata di base in dvw_matches (riusa logica esistente in modo minimale)
      const { error } = await supabase.from('dvw_matches').insert({
        user_id: user.id,
        file_name: file.name,
        squadra_casa: parsed.teams?.home?.name ?? null,
        avversario: parsed.teams?.away?.name ?? null,
        data: parsed.header?.date ?? null,
      } as never);
      if (error) throw error;
      toast.success('Partita DVW importata! La trovi in Archivio.');
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore parsing DVW';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---------- STEP 4: finish ----------
  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarded: true } as never)
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Tutto pronto!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        {skippedStep1 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>Sei stato associato a una società esistente. Completa il tuo profilo.</span>
          </div>
        )}
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase italic tracking-wide text-muted-foreground">
            <span>
              Step {skippedStep1 ? step - 1 : step} di {skippedStep1 ? 3 : 4}
            </span>
            <span>
              {Math.round(((skippedStep1 ? step - 1 : step) / (skippedStep1 ? 3 : 4)) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${((skippedStep1 ? step - 1 : step) / (skippedStep1 ? 3 : 4)) * 100}%`,
              }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight">
                Benvenuto in VolleyScout Pro 🏐
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Configuriamo il tuo account in 4 passi rapidi.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamName">Nome squadra *</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Es. Volley Milano U18"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleStep1}
              disabled={busy || !teamName.trim() || !category}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continua
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight">
                Chi sono le tue atlete?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Scegli un metodo per popolare la rosa.
              </p>
            </div>

            <button
              onClick={generateRoster}
              disabled={busy}
              className="min-h-20 w-full rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-4 px-5 text-left disabled:opacity-50"
            >
              <Zap className="w-7 h-7 text-primary shrink-0" />
              <div>
                <div className="font-bold text-base">⚡ Genera rosa base</div>
                <div className="text-xs text-muted-foreground">
                  14 giocatrici di esempio (modificabili in seguito)
                </div>
              </div>
            </button>

            <button
              onClick={() => xlsxRef.current?.click()}
              disabled={busy}
              className="min-h-20 w-full rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-4 px-5 text-left disabled:opacity-50"
            >
              <FileSpreadsheet className="w-7 h-7 text-primary shrink-0" />
              <div>
                <div className="font-bold text-base">📋 Importa da Excel</div>
                <div className="text-xs text-muted-foreground">
                  Colonne: Nome / Cognome / Numero / Ruolo
                </div>
              </div>
            </button>
            <input
              ref={xlsxRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleXlsx(f);
                e.target.value = '';
              }}
            />

            <button
              onClick={() => setStep(3)}
              disabled={busy}
              className="min-h-20 w-full rounded-xl border-2 border-dashed border-border hover:border-muted-foreground transition-colors flex items-center gap-4 px-5 text-left disabled:opacity-50"
            >
              <SkipForward className="w-7 h-7 text-muted-foreground shrink-0" />
              <div>
                <div className="font-bold text-base">⏭ Lo faccio dopo</div>
                <div className="text-xs text-muted-foreground">Salta questo passaggio</div>
              </div>
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Puoi sempre modificarle in <strong>Atleti → Gestione rosa</strong>.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight">
                Vuoi importare una partita?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Carica un file DVW per analizzarla subito.
              </p>
            </div>

            <button
              onClick={() => dvwRef.current?.click()}
              disabled={busy}
              className="min-h-20 w-full rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-4 px-5 text-left disabled:opacity-50"
            >
              <FileUp className="w-7 h-7 text-primary shrink-0" />
              <div>
                <div className="font-bold text-base">📁 Importa file DVW</div>
                <div className="text-xs text-muted-foreground">
                  Da DataVolley, VolleyStudio o Click&amp;Scout
                </div>
              </div>
            </button>
            <input
              ref={dvwRef}
              type="file"
              accept=".dvw"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleDvw(f);
                e.target.value = '';
              }}
            />

            <button
              onClick={() => setStep(4)}
              disabled={busy}
              className="min-h-20 w-full rounded-xl border-2 border-dashed border-border hover:border-muted-foreground transition-colors flex items-center gap-4 px-5 text-left disabled:opacity-50"
            >
              <SkipForward className="w-7 h-7 text-muted-foreground shrink-0" />
              <div>
                <div className="font-bold text-base">⏭ Lo faccio dopo</div>
                <div className="text-xs text-muted-foreground">Salta questo passaggio</div>
              </div>
            </button>

            <p className="text-xs text-muted-foreground text-center">
              I file DVW vengono da DataVolley, VolleyStudio o Click&amp;Scout.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight">
                Sei pronto! 🎉
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ecco da dove puoi iniziare.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: BarChart3, label: '📊 Analizza una partita', to: '/archive' },
                { icon: Calendar, label: '📅 Crea il calendario', to: '/calendario' },
                { icon: Activity, label: '🔴 Scout Live', to: '/scout' },
              ].map((it) => (
                <button
                  key={it.to}
                  onClick={async () => {
                    await finish();
                    navigate(it.to);
                  }}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
                >
                  <it.icon className="w-5 h-5 text-primary" />
                  <span className="font-semibold flex-1">{it.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            <Button className="w-full" onClick={finish} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Inizia <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

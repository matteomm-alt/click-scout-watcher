import { useEffect, useMemo, useState } from 'react';
import { BarChart2, Pencil, Settings, Target, Zap } from 'lucide-react';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { ActionPanel } from '@/components/ActionPanel';
import { AttackHeatmap } from '@/components/AttackHeatmap';
import { PlayerStatsPanel } from '@/components/PlayerStatsPanel';
import { QuickActions } from '@/components/QuickActions';
import { TeamComparison } from '@/components/TeamComparison';
import { SetDistribution } from '@/components/SetDistribution';
import { FullscreenToggle } from '@/components/FullscreenToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useScoutSettings, type ScoutSettings } from '@/lib/scoutSettings';
import { useMatchStore } from '@/store/matchStore';
import { SKILL_LABELS, SERVE_TYPES, type Evaluation, type ScoutAction } from '@/types/volleyball';

type RightTab = 'log' | 'stats' | 'heat' | 'compare' | 'sets' | 'dir';
type MobileTab = 'scout' | 'quick' | 'live';

const TABS: { key: RightTab; label: string }[] = [
  { key: 'log', label: 'Log' },
  { key: 'stats', label: 'Stats' },
  { key: 'heat', label: 'Heat' },
  { key: 'compare', label: 'VS' },
  { key: 'sets', label: 'Alz.' },
  { key: 'dir', label: 'Dir' },
];

const MOBILE_TABS = [
  { key: 'scout' as const, label: 'Scout', icon: Target },
  { key: 'quick' as const, label: 'Quick', icon: Zap },
  { key: 'live' as const, label: 'Live', icon: BarChart2 },
];

const RILEVAZIONE_ROWS = [
  { key: 'showServeType' as const, label: 'Tipo battuta', description: 'Mostra lo step per scegliere il tipo di servizio.' },
  { key: 'showAttackCombo' as const, label: 'Combo attacco', description: 'Mostra lo step per la combinazione di attacco.' },
  { key: 'showStartZone' as const, label: 'Zona origine', description: 'Richiede la zona di partenza dell’azione.' },
  { key: 'showEndZone' as const, label: 'Zona destinazione', description: 'Richiede la zona di arrivo dell’azione.' },
  { key: 'showAlzata' as const, label: 'Skill E', description: 'Mostra Alzata nella lista fondamentali.' },
  { key: 'showDifesa' as const, label: 'Skill D', description: 'Mostra Difesa nella lista fondamentali.' },
  { key: 'showFreeball' as const, label: 'Skill F', description: 'Mostra Freeball nella lista fondamentali.' },
  { key: 'autoPoint' as const, label: 'Punto automatico', description: 'Aggiunge punto automatico su # per A/S/B e su errore.' },
  { key: 'autoCorrelation' as const, label: 'Correlazione automatica', description: 'Aggiorna automaticamente battuta/ricezione e attacco/muro' },
  { key: 'showMuroVincente' as const, label: 'Muro vincente', description: 'Rileva chi fa muro punto' },
  { key: 'showMuroErrato' as const, label: 'Muro errato', description: 'Rileva chi commette errore a muro' },
  { key: 'sostituzioniLibere' as const, label: 'Sostituzioni libere', description: 'Senza vincoli regolamento' },
];

const VISUAL_ROWS = [
  { key: 'showAllDirections' as const, label: 'Tutte le direzioni', description: 'Mostra tutte le direzioni disponibili.' },
  { key: 'posizionaPerRuolo' as const, label: 'Posiziona per ruolo', description: 'Giocatori in posizione tattica dopo ricezione' },
];

export function LiveScout() {
  const { matchState, homeTeam, awayTeam, endSet, updateAction, deleteAction } = useMatchStore();
  const { settings, setSetting } = useScoutSettings();
  const [tab, setTab] = useState<RightTab>('log');
  const [mobileTab, setMobileTab] = useState<MobileTab>('scout');
  const [showEndSetDialog, setShowEndSetDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<ScoutAction | null>(null);
  const [editDraft, setEditDraft] = useState<{ playerNumber: string; evaluation: Evaluation; startZone: string; endZone: string }>({ playerNumber: '', evaluation: '#', startZone: 'none', endZone: 'none' });
  const [timeoutBanner, setTimeoutBanner] = useState(false);
  const recentActions = [...matchState.actions].reverse().slice(0, 30);


  useEffect(() => {
    const handler = () => {
      setTab('dir');
      setTimeoutBanner(true);
      window.setTimeout(() => setTimeoutBanner(false), 4000);
    };
    window.addEventListener('scout-timeout', handler);
    return () => window.removeEventListener('scout-timeout', handler);
  }, []);

  const openEditAction = (action: ScoutAction) => {
    setEditingAction(action);
    setEditDraft({
      playerNumber: String(action.playerNumber),
      evaluation: action.evaluation,
      startZone: action.startZone ? String(action.startZone) : 'none',
      endZone: action.endZone ? String(action.endZone) : 'none',
    });
  };

  const currentSetActions = matchState.actions.filter((a) => a.setNumber === matchState.currentSet);
  const endSetStats = {
    homeAce: currentSetActions.filter((a) => a.team === 'home' && a.skill === 'S' && a.evaluation === '#').length,
    awayAce: currentSetActions.filter((a) => a.team === 'away' && a.skill === 'S' && a.evaluation === '#').length,
    homeErr: currentSetActions.filter((a) => a.team === 'home' && a.evaluation === '=').length,
    awayErr: currentSetActions.filter((a) => a.team === 'away' && a.evaluation === '=').length,
    homeKill: currentSetActions.filter((a) => a.team === 'home' && a.skill === 'A' && a.evaluation === '#').length,
    awayKill: currentSetActions.filter((a) => a.team === 'away' && a.skill === 'A' && a.evaluation === '#').length,
  };

  const ActionLog = () => (
    <>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
        Azioni ({matchState.actions.length})
      </div>
      <div className="space-y-1">
        {recentActions.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-4">
            Nessuna azione registrata
          </div>
        )}
        {recentActions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 text-xs"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${action.team === 'home' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span className="font-mono text-primary font-bold">#{action.playerNumber}</span>
            <span className="text-muted-foreground">{SKILL_LABELS[action.skill]}</span>
            {action.attackCode && <span className="text-red-300/70 text-[10px] font-mono font-bold">{action.attackCode}</span>}
            {action.serveType && (
              <span className="text-blue-300/70 text-[10px] font-bold">
                {SERVE_TYPES.find(s => s.key === action.serveType)?.label || action.serveType}
              </span>
            )}
            <span className={`font-bold ${
              action.evaluation === '#' || action.evaluation === '+' ? 'text-accent' :
              action.evaluation === '=' || action.evaluation === '/' ? 'text-destructive' :
              'text-warning'
            }`}>
              {action.evaluation}
            </span>
            {(action.startZone || action.endZone) && (
              <span className="text-primary/60 text-[10px] font-mono">
                {action.startZone || '?'}→{action.endZone || '?'}
              </span>
            )}
            <span className="text-muted-foreground/50 ml-auto text-[10px]">{action.timestamp}</span>
            <button type="button" onClick={() => openEditAction(action)} className="min-h-8 min-w-8 rounded p-1 hover:bg-secondary ml-auto flex-shrink-0 active:scale-95" aria-label="Modifica azione">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {matchState.setResults.length > 0 && (
        <div className="border-t border-border mt-3 pt-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Set</div>
          {matchState.setResults.map((sr, i) => (
            <div key={i} className="flex justify-between text-xs text-foreground">
              <span>Set {i + 1}</span>
              <span className="font-bold">{sr.homeScore} - {sr.awayScore}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen flex-col p-3 gap-3 overflow-hidden">
        <FullscreenToggle />
        <ScoreBoard />

        <div className="flex-shrink-0">
          <VolleyballCourt />
        </div>

        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          <div className="col-span-3 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-3 h-full overflow-y-auto">
              <QuickActions />
            </div>
          </div>

          <div className="col-span-5 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-4 h-full flex flex-col">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Inserimento Azione
              </h3>
              <div className="flex-1 overflow-y-auto">
                <ActionPanel />
              </div>
            </div>
          </div>

          <div className="col-span-3 min-h-0 overflow-hidden">
            <div className="glass rounded-xl p-3 h-full flex flex-col">
              {timeoutBanner && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-warning px-3 py-2 text-sm font-black text-background">
                  <span>⏸ TIME-OUT — Analisi avversario</span>
                  <button type="button" onClick={() => setTimeoutBanner(false)} className="min-h-8 min-w-8 text-background/70 hover:text-background">✕</button>
                </div>
              )}
              <div className="grid grid-cols-6 gap-0.5 p-0.5 rounded-md bg-secondary/40 border border-border/50 mb-2">
                {TABS.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`text-[10px] font-bold uppercase tracking-wider py-1 rounded transition-colors active:scale-95 ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto">
                {tab === 'log' && <ActionLog />}
                {tab === 'stats' && <PlayerStatsPanel />}
                {tab === 'heat' && <AttackHeatmap team="all" />}
                {tab === 'compare' && <TeamComparison />}
                {tab === 'sets' && <SetDistribution />}
                {tab === 'dir' && <RotationDirections />}
              </div>
            </div>
          </div>
        </div>

        {matchState.isMatchEnded && (
          <div className="glass rounded-xl p-4 text-center">
            <h2 className="text-2xl font-bold text-primary">Partita Terminata</h2>
            <p className="text-foreground text-lg">
              {homeTeam.name} {matchState.homeSetsWon} - {matchState.awaySetsWon} {awayTeam.name}
            </p>
          </div>
        )}
      </div>

      <div className="lg:hidden h-screen flex flex-col p-2 gap-2 overflow-hidden pb-20">
        <ScoreBoard />

        {mobileTab === 'scout' && (
          <div className="flex max-h-40 shrink-0 overflow-hidden">
            <VolleyballCourt />
          </div>
        )}

        {mobileTab === 'scout' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEndSetDialog(true)}
              className="min-h-14 px-6 rounded-xl bg-secondary text-warning font-black border border-warning/40 transition-transform duration-75 active:scale-95"
            >
              ⏭ Fine Set
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="ml-auto min-h-14 w-14 rounded-xl bg-secondary text-foreground font-black transition-transform duration-75 active:scale-95"
                  aria-label="Impostazioni scout"
                >
                  <Settings className="mx-auto h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Impostazioni scout</SheetTitle>
                </SheetHeader>
                <ScoutSettingsPanel settings={settings} setSetting={setSetting} />
              </SheetContent>
            </Sheet>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto glass rounded-xl p-3">
          {mobileTab === 'scout' && <ActionPanel />}
          {mobileTab === 'quick' && <QuickActions />}
          {mobileTab === 'live' && (
            <div className="space-y-4">
              {timeoutBanner && (
                <div className="flex items-center justify-between rounded-lg bg-warning px-3 py-2 text-sm font-black text-background">
                  <span>⏸ TIME-OUT — Analisi avversario</span>
                  <button type="button" onClick={() => setTimeoutBanner(false)} className="min-h-8 min-w-8 text-background/70 hover:text-background">✕</button>
                </div>
              )}
              <ActionLog />
              <PlayerStatsPanel />
              <AttackHeatmap team="all" />
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-1 border-t border-border bg-background/95 p-2 backdrop-blur">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = mobileTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMobileTab(item.key)}
                className={`min-h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all duration-75 active:scale-95 ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    
      <EndSetDialog open={showEndSetDialog} onOpenChange={setShowEndSetDialog} stats={endSetStats} onConfirm={() => { endSet(); setShowEndSetDialog(false); }} currentSet={matchState.currentSet} homeName={homeTeam.name || 'Casa'} awayName={awayTeam.name || 'Ospite'} homeScore={matchState.homeScore} awayScore={matchState.awayScore} />

      <Dialog open={editingAction !== null} onOpenChange={(open) => !open && setEditingAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica azione #{editingAction?.playerNumber} {editingAction?.skill}</DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-3">
              <Select value={editDraft.playerNumber} onValueChange={(v) => setEditDraft((d) => ({ ...d, playerNumber: v }))}>
                <SelectTrigger><SelectValue placeholder="Giocatore" /></SelectTrigger>
                <SelectContent>
                  {(editingAction.team === 'home' ? matchState.homeCurrentLineup : matchState.awayCurrentLineup).map((n) => <SelectItem key={n} value={String(n)}>#{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editDraft.evaluation} onValueChange={(v) => setEditDraft((d) => ({ ...d, evaluation: v as Evaluation }))}>
                <SelectTrigger><SelectValue placeholder="Valutazione" /></SelectTrigger>
                <SelectContent>{(['#', '+', '!', '-', '/', '='] as Evaluation[]).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editDraft.startZone} onValueChange={(v) => setEditDraft((d) => ({ ...d, startZone: v }))}>
                <SelectTrigger><SelectValue placeholder="Zona origine" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nessuna</SelectItem>{[1,2,3,4,5,6,7,8,9].map((z) => <SelectItem key={z} value={String(z)}>{z}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editDraft.endZone} onValueChange={(v) => setEditDraft((d) => ({ ...d, endZone: v }))}>
                <SelectTrigger><SelectValue placeholder="Zona destinazione" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nessuna</SelectItem>{[1,2,3,4,5,6,7,8,9].map((z) => <SelectItem key={z} value={String(z)}>{z}</SelectItem>)}</SelectContent>
              </Select>
              <button type="button" className="min-h-12 w-full rounded bg-destructive font-bold text-destructive-foreground" onClick={() => { deleteAction(editingAction.id); setEditingAction(null); }}>Elimina</button>
              <div className="flex gap-2">
                <button type="button" className="min-h-12 flex-1 rounded bg-secondary font-bold" onClick={() => setEditingAction(null)}>Annulla</button>
                <button type="button" className="min-h-12 flex-1 rounded bg-primary font-bold text-primary-foreground" onClick={() => { updateAction(editingAction.id, { playerNumber: Number(editDraft.playerNumber), evaluation: editDraft.evaluation, startZone: editDraft.startZone === 'none' ? null : Number(editDraft.startZone), endZone: editDraft.endZone === 'none' ? null : Number(editDraft.endZone) }); setEditingAction(null); }}>Salva</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
      <div>
        <div className="text-sm font-black text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ScoutSettingsPanel({ settings, setSetting }: { settings: ScoutSettings; setSetting: <K extends keyof ScoutSettings>(key: K, value: ScoutSettings[K]) => void }) {
  return (
    <div className="mt-4 space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Rilevazione</h3>
        <div className="space-y-3">
          {RILEVAZIONE_ROWS.map((row) => <SettingRow key={row.key} label={row.label} description={row.description} checked={settings[row.key]} onChange={(checked) => setSetting(row.key, checked)} />)}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Valori predefiniti</h3>
        <div className="grid gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <Select value={settings.attaccoPredefinito} onValueChange={(v) => setSetting('attaccoPredefinito', v as ScoutSettings['attaccoPredefinito'])}>
            <SelectTrigger><SelectValue placeholder="Attacco predefinito" /></SelectTrigger>
            <SelectContent><SelectItem value="H">H — Alta</SelectItem><SelectItem value="Q">Q — Veloce</SelectItem><SelectItem value="T">T — Tesa</SelectItem></SelectContent>
          </Select>
          <Select value={settings.ricezionePredefinita} onValueChange={(v) => setSetting('ricezionePredefinita', v as ScoutSettings['ricezionePredefinita'])}>
            <SelectTrigger><SelectValue placeholder="Ricezione predefinita" /></SelectTrigger>
            <SelectContent>{(['#', '+', '!', '-', '/', '='] as const).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Visualizzazione</h3>
        <div className="space-y-3">
          {VISUAL_ROWS.map((row) => <SettingRow key={row.key} label={row.label} description={row.description} checked={settings[row.key]} onChange={(checked) => setSetting(row.key, checked)} />)}
        </div>
      </section>
    </div>
  );
}

function EndSetDialog({ open, onOpenChange, stats, onConfirm, currentSet, homeName, awayName, homeScore, awayScore }: { open: boolean; onOpenChange: (v: boolean) => void; stats: Record<string, number>; onConfirm: () => void; currentSet: number; homeName: string; awayName: string; homeScore: number; awayScore: number }) {
  const rows = [['Ace Casa', stats.homeAce], ['Ace Ospite', stats.awayAce], ['Errori Casa', stats.homeErr], ['Errori Ospite', stats.awayErr], ['Kill Casa', stats.homeKill], ['Kill Ospite', stats.awayKill]];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fine Set {currentSet}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-center text-3xl font-black">{homeName} {homeScore} — {awayScore} {awayName}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map(([label, value]) => <div key={label} className="rounded-lg bg-secondary p-3 text-center"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black text-primary">{value}</div></div>)}
          </div>
          <div className="flex gap-2"><button type="button" onClick={() => onOpenChange(false)} className="min-h-14 flex-1 rounded bg-secondary font-bold">Annulla</button><button type="button" onClick={onConfirm} className="min-h-14 flex-1 rounded bg-primary font-black text-primary-foreground">Conferma Fine Set</button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RotationDirections() {
  const { matchState } = useMatchStore();
  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all');
  const [zoom, setZoom] = useState<number | null>(null);
  const zone = (z?: number) => ({ 4: [15, 10], 3: [45, 10], 2: [75, 10], 5: [15, 30], 6: [45, 30], 1: [75, 30], 7: [15, 50], 8: [45, 50], 9: [75, 50] } as Record<number, number[]>)[z || 0];
  const actionsFor = (rot: number) => matchState.actions.filter((a, idx, arr) => {
    if (a.skill !== 'A' || a.team !== team || (team === 'home' ? a.homeSetterPosition : a.awaySetterPosition) !== rot) return false;
    const prevR = [...arr.slice(0, idx)].reverse().find((x) => x.skill === 'R');
    if (filter === 'pos') return prevR?.evaluation === '#' || prevR?.evaluation === '+';
    if (filter === 'neg') return prevR?.evaluation === '-' || prevR?.evaluation === '/';
    return true;
  });
  const Field = ({ rot, large = false }: { rot: number; large?: boolean }) => {
    const acts = actionsFor(rot);
    return <svg viewBox="0 0 90 60" width="100%" className="rounded-lg bg-secondary/60"><text x="4" y="10" className="fill-foreground text-[8px] font-bold">R{rot}</text>{[30,60].map(x=><line key={x} x1={x} y1="0" x2={x} y2="60" stroke="rgba(255,255,255,.25)" />)}{[20,40].map(y=><line key={y} x1="0" y1={y} x2="90" y2={y} stroke="rgba(255,255,255,.25)" />)}{acts.map((a,i)=>{const s=zone(a.startZone), e=zone(a.endZone); if(!s||!e)return null; const c=a.evaluation==='#'?'#16a34a':(a.evaluation==='='||a.evaluation==='/')?'#dc2626':'#ca8a04'; return <line key={a.id} x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={c} strokeWidth={i===acts.length-1?'2.5':'1.2'} strokeLinecap="round" />})}</svg>;
  };
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{(['home','away'] as const).map(t=><button key={t} onClick={()=>setTeam(t)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${team===t?'bg-primary text-primary-foreground':'bg-secondary'}`}>{t==='home'?'CASA':'OSPITE'}</button>)}{(['all','pos','neg'] as const).map(f=><button key={f} onClick={()=>setFilter(f)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${filter===f?'bg-primary text-primary-foreground':'bg-secondary'}`}>{f==='all'?'TUTTI':f==='pos'?'RIC+':'CONTRO'}</button>)}</div><div className="grid grid-cols-2 gap-2">{[1,2,3,4,5,6].map(r=><button key={r} onClick={()=>setZoom(r)}><Field rot={r} /></button>)}</div><Dialog open={zoom!==null} onOpenChange={(o)=>!o&&setZoom(null)}><DialogContent>{zoom && <Field rot={zoom} large />}</DialogContent></Dialog></div>;
}


import { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useActiveSociety } from '@/hooks/useActiveSociety';
import { usePreferences } from '@/hooks/usePreferences';
import { isFeatureEnabled } from '@/lib/societyFeatures';
import { BLOCKS, GENERAL_ITEMS, type BlockId, type NavItem } from '@/lib/navConfig';
import {
  cardsOfBlock, CARD_BY_ID, MAX_VISIBLE, MIN_VISIBLE, type HomeCardId, type UserPrefs,
} from '@/lib/homeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SortableList, SortableRow } from '@/components/personalizza/Sortable';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/**
 * Preferenze personali: blocchi, voci di menu e card della Home.
 * La società decide cosa è disponibile (moduli attivi); qui ogni utente può solo nascondere altro.
 */
export default function Personalizza() {
  const { features, isAdmin } = useActiveSociety();
  const { prefs, update, reset, ready } = usePreferences();
  const [busy, setBusy] = useState(false);

  const apply = async (fn: (p: UserPrefs) => UserPrefs) => {
    setBusy(true);
    try {
      await update(fn);
      toast.success('Preferenze salvate', { id: 'prefs-saved', duration: 1500 });
    } catch (e) {
      console.error(e);
      toast.error('Salvataggio non riuscito: le modifiche restano su questo dispositivo.');
    } finally {
      setBusy(false);
    }
  };

  const itemAvailable = (i: NavItem) => !i.feature || isFeatureEnabled(features, i.feature);

  const toggleBlock = (id: BlockId, on: boolean) =>
    apply((p) => ({ ...p, hiddenBlocks: on ? p.hiddenBlocks.filter((b) => b !== id) : [...p.hiddenBlocks, id] }));

  const toggleItem = (url: string, on: boolean) =>
    apply((p) => ({ ...p, hiddenItems: on ? p.hiddenItems.filter((u) => u !== url) : [...p.hiddenItems, url] }));

  const reorderBlocks = (ids: BlockId[]) => apply((p) => ({ ...p, blockOrder: ids }));

  const toggleCard = (block: BlockId, id: HomeCardId, on: boolean) =>
    apply((p) => {
      const cards = on ? [...p.home[block].cards, id] : p.home[block].cards.filter((c) => c !== id);
      return { ...p, home: { ...p.home, [block]: { ...p.home[block], cards } } };
    });

  const reorderCards = (block: BlockId, cards: HomeCardId[]) =>
    apply((p) => ({ ...p, home: { ...p.home, [block]: { ...p.home[block], cards } } }));

  const setMax = (block: BlockId, max: number) =>
    apply((p) => ({ ...p, home: { ...p.home, [block]: { ...p.home[block], max } } }));

  const handleReset = async () => {
    setBusy(true);
    try {
      await reset();
      toast.success('Impostazioni ripristinate');
    } catch (e) {
      console.error(e);
      toast.error('Ripristino non riuscito');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Personalizza</h1>
            <p className="text-sm text-muted-foreground">
              Scegli cosa vedere in menu e nella Home. Valgono solo per te.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={busy || !ready}>
          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Ripristina
        </Button>
      </div>

      {/* Ordine dei blocchi */}
      <Card>
        <CardHeader>
          <CardTitle>Blocchi</CardTitle>
          <CardDescription>
            Attiva o nascondi un intero blocco (sparisce da menu e Home) e scegli l'ordine in cui compaiono.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <SortableList ids={prefs.blockOrder} disabled={busy} onReorder={reorderBlocks}>
            {prefs.blockOrder.map((id) => {
              const b = BLOCKS[id];
              const on = !prefs.hiddenBlocks.includes(id);
              return (
                <SortableRow key={id} id={id} label={b.label} disabled={busy} className={`rounded-lg border ${b.border} ${b.bg} p-3 mb-2`}>
                  <span className={`h-3 w-3 rounded-full shrink-0 ${b.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-black uppercase italic ${b.text}`}>{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                  </div>
                  <Switch checked={on} disabled={busy} onCheckedChange={(v) => toggleBlock(id, v)} aria-label={`Mostra ${b.label}`} />
                </SortableRow>
              );
            })}
          </SortableList>
        </CardContent>
      </Card>

      {/* Dettaglio per blocco */}
      <Accordion type="multiple" className="space-y-4">
      {prefs.blockOrder.map((id) => {
        const b = BLOCKS[id];
        const blockOn = !prefs.hiddenBlocks.includes(id);
        const home = prefs.home[id];
        const available = cardsOfBlock(id).filter(
          (c) => (!c.feature || isFeatureEnabled(features, c.feature)) && (!c.adminOnly || isAdmin),
        );
        const selected = home.cards.filter((c) => available.some((a) => a.id === c));
        const unselected = available.filter((a) => !home.cards.includes(a.id));
        const hiddenCount = b.items.filter((i) => prefs.hiddenItems.includes(i.url)).length;
        const summary = blockOn
          ? `${selected.length} card in Home · ${hiddenCount ? `${hiddenCount} ${hiddenCount === 1 ? 'voce nascosta' : 'voci nascoste'}` : 'tutte le voci nel menu'}`
          : 'Blocco nascosto';

        return (
          <AccordionItem key={id} value={id} className={`rounded-xl border bg-card ${blockOn ? '' : 'opacity-60'}`}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left">
                <span className={`flex items-center gap-2 text-lg font-semibold ${b.text}`}>
                  <span className={`h-3 w-3 rounded-full ${b.dot}`} /> {b.label}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{summary}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sezioni nel menu</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {b.items.filter(itemAvailable).map((i) => (
                    <div key={i.url} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <Label className="flex items-center gap-2 text-sm cursor-pointer">
                        <i.icon className="h-4 w-4 text-muted-foreground" /> {i.title}
                      </Label>
                      <Switch
                        checked={!prefs.hiddenItems.includes(i.url)}
                        disabled={busy || !blockOn}
                        onCheckedChange={(v) => toggleItem(i.url, v)}
                        aria-label={`Mostra ${i.title}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Card in Home</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Card visibili</Label>
                    <Select value={String(home.max)} disabled={busy || !blockOn} onValueChange={(v) => setMax(id, Number(v))}>
                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: MAX_VISIBLE - MIN_VISIBLE + 1 }, (_, k) => MIN_VISIBLE + k).map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selected.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessuna card selezionata: il blocco resterà vuoto.</p>
                )}
                <SortableList ids={selected} disabled={busy || !blockOn} onReorder={(next) => reorderCards(id, next)}>
                  {selected.map((cid) => (
                    <SortableRow key={cid} id={cid} label={CARD_BY_ID[cid].label} disabled={busy || !blockOn} className="rounded-md border border-border/60 px-2 py-2 mb-2">
                      <Switch checked disabled={busy || !blockOn} onCheckedChange={() => toggleCard(id, cid, false)} aria-label={`Nascondi ${CARD_BY_ID[cid].label}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{CARD_BY_ID[cid].label}</p>
                        <p className="text-xs text-muted-foreground truncate">{CARD_BY_ID[cid].description}</p>
                      </div>
                    </SortableRow>
                  ))}
                </SortableList>
                {unselected.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 opacity-70">
                    <Switch checked={false} disabled={busy || !blockOn} onCheckedChange={() => toggleCard(id, c.id, true)} aria-label={`Mostra ${c.label}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
      </Accordion>

      {/* Voci generali */}
      {GENERAL_ITEMS.some(itemAvailable) && (
        <Card>
          <CardHeader>
            <CardTitle>Generale</CardTitle>
            <CardDescription>Voci fuori dai tre blocchi. Home non si può nascondere.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {GENERAL_ITEMS.filter(itemAvailable).map((i) => (
              <div key={i.url} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <Label className="flex items-center gap-2 text-sm"><i.icon className="h-4 w-4 text-muted-foreground" /> {i.title}</Label>
                <Switch checked={!prefs.hiddenItems.includes(i.url)} disabled={busy} onCheckedChange={(v) => toggleItem(i.url, v)} aria-label={`Mostra ${i.title}`} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cambia password</CardTitle>
          <CardDescription>Imposta una nuova password per il tuo account.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm submitLabel="Aggiorna password" />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        I moduli disponibili sono decisi dalla società; qui puoi solo nascondere ciò che non ti serve.
      </p>
    </div>
  );
}

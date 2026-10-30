import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from 'lucide-react';
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
import { PasswordForm } from '@/components/auth/PasswordForm';
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

  const moveBlock = (id: BlockId, dir: -1 | 1) =>
    apply((p) => {
      const order = [...p.blockOrder];
      const i = order.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= order.length) return p;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...p, blockOrder: order };
    });

  const toggleCard = (block: BlockId, id: HomeCardId, on: boolean) =>
    apply((p) => {
      const cards = on ? [...p.home[block].cards, id] : p.home[block].cards.filter((c) => c !== id);
      return { ...p, home: { ...p.home, [block]: { ...p.home[block], cards } } };
    });

  const moveCard = (block: BlockId, id: HomeCardId, dir: -1 | 1) =>
    apply((p) => {
      const cards = [...p.home[block].cards];
      const i = cards.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cards.length) return p;
      [cards[i], cards[j]] = [cards[j], cards[i]];
      return { ...p, home: { ...p.home, [block]: { ...p.home[block], cards } } };
    });

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
          {prefs.blockOrder.map((id, idx) => {
            const b = BLOCKS[id];
            const on = !prefs.hiddenBlocks.includes(id);
            return (
              <div key={id} className={`flex items-center gap-3 rounded-lg border ${b.border} ${b.bg} p-3`}>
                <span className={`h-3 w-3 rounded-full shrink-0 ${b.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-black uppercase italic ${b.text}`}>{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
                <Button variant="ghost" size="icon" disabled={busy || idx === 0} onClick={() => moveBlock(id, -1)} aria-label={`Sposta ${b.label} in alto`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={busy || idx === prefs.blockOrder.length - 1} onClick={() => moveBlock(id, 1)} aria-label={`Sposta ${b.label} in basso`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Switch checked={on} disabled={busy} onCheckedChange={(v) => toggleBlock(id, v)} aria-label={`Mostra ${b.label}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dettaglio per blocco */}
      {prefs.blockOrder.map((id) => {
        const b = BLOCKS[id];
        const blockOn = !prefs.hiddenBlocks.includes(id);
        const home = prefs.home[id];
        const available = cardsOfBlock(id).filter(
          (c) => (!c.feature || isFeatureEnabled(features, c.feature)) && (!c.adminOnly || isAdmin),
        );
        const selected = home.cards.filter((c) => available.some((a) => a.id === c));
        const unselected = available.filter((a) => !home.cards.includes(a.id));

        return (
          <Card key={id} className={blockOn ? '' : 'opacity-50'}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${b.text}`}>
                <span className={`h-3 w-3 rounded-full ${b.dot}`} /> {b.label}
              </CardTitle>
              <CardDescription>Voci di menu e card della Home di questo blocco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                {selected.map((cid, idx) => (
                  <div key={cid} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
                    <Switch checked disabled={busy || !blockOn} onCheckedChange={() => toggleCard(id, cid, false)} aria-label={`Nascondi ${CARD_BY_ID[cid].label}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{CARD_BY_ID[cid].label}</p>
                      <p className="text-xs text-muted-foreground truncate">{CARD_BY_ID[cid].description}</p>
                    </div>
                    <Button variant="ghost" size="icon" disabled={busy || !blockOn || idx === 0} onClick={() => moveCard(id, cid, -1)} aria-label="Sposta su">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={busy || !blockOn || idx === selected.length - 1} onClick={() => moveCard(id, cid, 1)} aria-label="Sposta giù">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
            </CardContent>
          </Card>
        );
      })}

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

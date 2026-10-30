import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MIN_LENGTH = 8;

/** Modulo per impostare una nuova password per l'utente con sessione attiva (anche di recupero). */
export function PasswordForm({ onDone, submitLabel = 'Salva nuova password' }: {
  onDone?: () => void;
  submitLabel?: string;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`La password deve avere almeno ${MIN_LENGTH} caratteri.`);
      return;
    }
    if (password !== confirm) {
      setError('Le due password non coincidono.');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      const m = err.message.toLowerCase();
      setError(
        m.includes('different from the old')
          ? 'La nuova password deve essere diversa da quella attuale.'
          : m.includes('pwned') || m.includes('compromised')
            ? 'Questa password è stata compromessa in passato. Scegline un’altra.'
            : err.message,
      );
      return;
    }
    setPassword('');
    setConfirm('');
    toast.success('Password aggiornata');
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nuova password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Ripeti la password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {submitLabel}
      </Button>
    </form>
  );
}

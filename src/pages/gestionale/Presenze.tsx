import { ClipboardCheck } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Presenze() {
  return (
    <PlaceholderPage
      block="gestionale"
      icon={ClipboardCheck}
      title="Presenze"
      description="Registra presenze/assenze/giustificati per ogni evento. Statistiche di partecipazione per atleta."
    />
  );
}

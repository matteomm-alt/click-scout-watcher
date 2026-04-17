import { ClipboardList } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Allenamenti() {
  return (
    <PlaceholderPage
      block="coaching"
      icon={ClipboardList}
      title="Allenamenti"
      description="Crea sedute di allenamento componendo blocchi di esercizi. Programma data, durata, obiettivi."
    />
  );
}

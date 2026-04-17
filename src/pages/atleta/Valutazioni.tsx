import { Star } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function Valutazioni() {
  return (
    <PlaceholderPage
      block="atleta"
      icon={Star}
      title="Valutazioni tecniche"
      description="Voti per fondamentale (battuta, ricezione, attacco, muro, difesa, alzata) con note e storico."
    />
  );
}

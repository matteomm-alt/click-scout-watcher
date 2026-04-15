import { useMatchStore } from '@/store/matchStore';
import { MatchSetup } from '@/components/MatchSetup';
import { RosterManager } from '@/components/RosterManager';
import { LineupSelector } from '@/components/LineupSelector';
import { LiveScout } from '@/components/LiveScout';

const Index = () => {
  const step = useMatchStore((s) => s.step);

  switch (step) {
    case 'setup':
      return <MatchSetup />;
    case 'roster':
      return <RosterManager />;
    case 'lineup':
      return <LineupSelector />;
    case 'scout':
      return <LiveScout />;
    default:
      return <MatchSetup />;
  }
};

export default Index;

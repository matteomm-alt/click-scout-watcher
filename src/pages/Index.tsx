import { useMatchStore } from '@/store/matchStore';
import { MatchSetup } from '@/components/MatchSetup';
import { RosterManager } from '@/components/RosterManager';
import { LineupSelector } from '@/components/LineupSelector';
import { LiveScout } from '@/components/LiveScout';
import { MatchConfig } from '@/components/MatchConfig';

const Index = () => {
  const step = useMatchStore((s) => s.step);
  const isMatchStarted = useMatchStore((s) => s.matchState.isMatchStarted);

  switch (step) {
    case 'setup':
      return <MatchSetup />;
    case 'roster':
      return <RosterManager />;
    case 'lineup':
      return <LineupSelector />;
    case 'config':
      return isMatchStarted ? <LiveScout /> : <MatchConfig />;
    case 'scout':
      return <LiveScout />;
    default:
      return <MatchSetup />;
  }
};

export default Index;

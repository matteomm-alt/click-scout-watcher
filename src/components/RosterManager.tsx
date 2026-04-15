import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import type { Player, PlayerRole, Team } from '@/types/volleyball';
import { ROLE_LABELS } from '@/types/volleyball';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowRight, ArrowLeft, Users, UserPlus } from 'lucide-react';

function PlayerForm({ onAdd }: { onAdd: (p: Omit<Player, 'id'>) => void }) {
  const [number, setNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<PlayerRole>('O');
  const [isLibero, setIsLibero] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);

  const handleSubmit = () => {
    if (!number || !lastName) return;
    onAdd({
      number: parseInt(number),
      lastName: lastName.toUpperCase(),
      firstName,
      role: isLibero ? 'L' : role,
      isLibero,
      isCaptain,
    });
    setNumber('');
    setLastName('');
    setFirstName('');
    setRole('O');
    setIsLibero(false);
    setIsCaptain(false);
  };

  const roles: PlayerRole[] = ['S', 'O', 'OP', 'M', 'L'];

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary mb-2">
        <UserPlus className="w-4 h-4" />
        <span className="text-sm font-semibold">Aggiungi Giocatore</span>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-2">
          <Input
            type="number"
            placeholder="#"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="bg-secondary border-border text-foreground text-center text-lg font-bold"
            min={1}
            max={99}
          />
        </div>
        <div className="col-span-4">
          <Input
            placeholder="Cognome"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="bg-secondary border-border text-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="col-span-3">
          <Input
            placeholder="Nome"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="bg-secondary border-border text-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="col-span-3 flex gap-1">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setIsLibero(r === 'L');
              }}
              className={`flex-1 rounded-md text-xs font-bold py-2 transition-all ${
                (isLibero ? 'L' : role) === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isCaptain}
            onChange={(e) => setIsCaptain(e.target.checked)}
            className="accent-primary"
          />
          Capitano
        </label>
        <div className="flex-1" />
        <Button onClick={handleSubmit} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Aggiungi
        </Button>
      </div>
    </div>
  );
}

function TeamRoster({ side, team }: { side: 'home' | 'away'; team: Team }) {
  const { addPlayer, removePlayer, setHomeTeam, setAwayTeam } = useMatchStore();
  const setTeam = side === 'home' ? setHomeTeam : setAwayTeam;

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {side === 'home' ? 'Squadra Casa' : 'Squadra Ospite'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome Squadra</Label>
            <Input
              value={team.name}
              onChange={(e) => setTeam({ name: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Nome squadra"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Codice (3 lettere)</Label>
            <Input
              value={team.code}
              onChange={(e) => setTeam({ code: e.target.value.toUpperCase().slice(0, 3) })}
              className="bg-secondary border-border text-foreground"
              placeholder="COD"
              maxLength={3}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allenatore</Label>
            <Input
              value={team.coach}
              onChange={(e) => setTeam({ coach: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">2° Allenatore</Label>
            <Input
              value={team.assistantCoach}
              onChange={(e) => setTeam({ assistantCoach: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>
      </div>

      <PlayerForm
        onAdd={(p) => addPlayer(side, { ...p, id: crypto.randomUUID() })}
      />

      <div className="space-y-1">
        {team.players.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nessun giocatore inserito
          </div>
        )}
        {team.players
          .sort((a, b) => a.number - b.number)
          .map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
                {player.number}
              </span>
              <div className="flex-1">
                <span className="font-semibold text-foreground">{player.lastName}</span>
                {player.firstName && (
                  <span className="text-muted-foreground ml-2">{player.firstName}</span>
                )}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                player.isLibero ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'
              }`}>
                {ROLE_LABELS[player.role]}
              </span>
              {player.isCaptain && (
                <span className="text-xs font-bold px-2 py-1 rounded bg-warning/20 text-warning">C</span>
              )}
              <button
                onClick={() => removePlayer(side, player.id)}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export function RosterManager() {
  const { homeTeam, awayTeam, setStep } = useMatchStore();

  const canContinue = homeTeam.players.length >= 6 && awayTeam.players.length >= 6 && homeTeam.name && awayTeam.name;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep('setup')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Roster Squadre</h1>
          <Button
            onClick={() => setStep('lineup')}
            disabled={!canContinue}
            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            Continua <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <TeamRoster side="home" team={homeTeam} />
          <TeamRoster side="away" team={awayTeam} />
        </div>

        {!canContinue && (
          <p className="text-center text-muted-foreground text-sm">
            Inserisci almeno 6 giocatori per squadra e il nome di entrambe le squadre per continuare
          </p>
        )}
      </div>
    </div>
  );
}

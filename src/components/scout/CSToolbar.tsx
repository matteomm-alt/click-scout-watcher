import { Undo2, ArrowLeftRight, Clock, SkipForward, Download, RotateCcw, Settings } from 'lucide-react';

interface CSToolbarProps {
  onUndoAction?: () => void;
  onUndoRally?: () => void;
  onSubstitution?: () => void;
  onTimeoutHome?: () => void;
  onTimeoutAway?: () => void;
  onEndSet?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onPointHome?: () => void;
  onPointAway?: () => void;
  homeName?: string;
  awayName?: string;
  homeTimeoutsLeft?: number;
  awayTimeoutsLeft?: number;
}

function ToolbarBtn({
  onClick, children, title, variant = 'default', disabled, noShrink,
}: {
  onClick?: () => void; children: React.ReactNode; title?: string;
  variant?: 'default' | 'primary' | 'warning' | 'destructive' | 'home' | 'away';
  disabled?: boolean;
  noShrink?: boolean;
}) {
  const v: Record<string, string> = {
    default: 'bg-secondary text-foreground border-border hover:bg-secondary/80',
    primary: 'bg-primary text-primary-foreground border-primary hover:brightness-110',
    warning: 'bg-warning text-background border-warning hover:brightness-110',
    destructive: 'bg-destructive text-destructive-foreground border-destructive hover:brightness-110',
    home: 'bg-[hsl(var(--cs-team-a))] text-white border-[hsl(var(--cs-team-a))] hover:brightness-110',
    away: 'bg-[hsl(var(--cs-team-b))] text-white border-[hsl(var(--cs-team-b))] hover:brightness-110',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`min-h-[48px] px-3 rounded-lg border-2 font-black uppercase tracking-wider text-[13px] flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${noShrink ? 'flex-shrink-0' : ''} ${v[variant]}`}
    >
      {children}
    </button>
  );
}

export function CSToolbar({
  onUndoAction, onUndoRally, onSubstitution,
  onTimeoutHome, onTimeoutAway, onEndSet, onExport, onSettings,
  onPointHome, onPointAway,
  homeName = 'Casa', awayName = 'Ospite',
  homeTimeoutsLeft = 2, awayTimeoutsLeft = 2,
}: CSToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-1">
      <ToolbarBtn onClick={onPointHome} variant="home" title={`+1 ${homeName}`}>
        +1 {homeName.slice(0, 8).toUpperCase()}
      </ToolbarBtn>
      <ToolbarBtn onClick={onPointAway} variant="away" title={`+1 ${awayName}`}>
        +1 {awayName.slice(0, 8).toUpperCase()}
      </ToolbarBtn>

      <div className="h-8 w-px bg-border mx-1" />

      <ToolbarBtn onClick={onUndoAction} title="Annulla ultima azione">
        <Undo2 className="w-4 h-4" /> Undo
      </ToolbarBtn>
      <ToolbarBtn onClick={onUndoRally} title="Annulla rally corrente">
        <Undo2 className="w-4 h-4" /> Rally
      </ToolbarBtn>
      <ToolbarBtn onClick={onSubstitution} title="Sostituzione">
        <ArrowLeftRight className="w-4 h-4" /> Sub
      </ToolbarBtn>

      <ToolbarBtn onClick={onTimeoutHome} title={`T-O ${homeName} (${homeTimeoutsLeft} disp.)`} disabled={homeTimeoutsLeft <= 0}>
        <Clock className="w-4 h-4" /> T-O {homeName.slice(0, 4)}
      </ToolbarBtn>
      <ToolbarBtn onClick={onTimeoutAway} title={`T-O ${awayName} (${awayTimeoutsLeft} disp.)`} disabled={awayTimeoutsLeft <= 0}>
        <Clock className="w-4 h-4" /> T-O {awayName.slice(0, 4)}
      </ToolbarBtn>

      <div className="flex-1" />

      <ToolbarBtn onClick={onEndSet} variant="warning" title="Fine set">
        <SkipForward className="w-4 h-4" /> Fine set
      </ToolbarBtn>
      <ToolbarBtn onClick={onExport} variant="primary" title="Esporta DVW">
        <Download className="w-4 h-4" /> DVW
      </ToolbarBtn>
      {onSettings && (
        <ToolbarBtn onClick={onSettings} title="Impostazioni">
          <Settings className="w-4 h-4" />
        </ToolbarBtn>
      )}
    </div>
  );
}

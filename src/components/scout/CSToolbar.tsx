import React from 'react';
import { useTranslation } from 'react-i18next';
import { Undo2, ArrowLeftRight, Clock, SkipForward, Download, Settings, CornerUpLeft } from 'lucide-react';

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

function LongPressBtn({
  onLongPress, children, title, variant = 'default', duration = 800, noShrink,
}: {
  onLongPress: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'primary' | 'warning' | 'destructive';
  duration?: number;
  noShrink?: boolean;
}) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = React.useState(0);

  const start = () => {
    setProgress(0);
    const step = 100 / (duration / 50);
    intervalRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(0);
      navigator.vibrate?.(40);
      onLongPress();
    }, duration);
  };

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
  };

  const v: Record<string, string> = {
    default: 'bg-secondary text-foreground border-border',
    warning: 'bg-warning text-background border-warning',
    destructive: 'bg-destructive text-destructive-foreground border-destructive',
    primary: 'bg-primary text-primary-foreground border-primary',
  };

  return (
    <button
      type="button"
      title={title}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative min-h-[48px] px-3 rounded-lg border-2 font-black uppercase tracking-wider text-[13px] flex items-center gap-2 transition-all active:scale-95 overflow-hidden select-none ${noShrink ? 'flex-shrink-0' : ''} ${v[variant]}`}
    >
      {progress > 0 && (
        <span
          className="absolute inset-y-0 left-0 bg-background/30 pointer-events-none transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

export function CSToolbar({
  onUndoAction, onUndoRally, onSubstitution,
  onTimeoutHome, onTimeoutAway, onEndSet, onExport, onSettings,
  onPointHome, onPointAway, onQuickActions,
  homeName = 'Casa', awayName = 'Ospite',
  homeTimeoutsLeft = 2, awayTimeoutsLeft = 2,
}: CSToolbarProps & { onQuickActions?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto py-1">
      <ToolbarBtn onClick={onPointHome} variant="home" title={`${t('scout.ui.pointFor')} ${homeName}`} noShrink>
        <span className="hidden sm:inline">{t('scout.ui.pointFor')} {homeName.slice(0, 8).toUpperCase()}</span>
        <span className="sm:hidden">{t('scout.ui.pointFor')}</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={onPointAway} variant="away" title={`${t('scout.ui.pointFor')} ${awayName}`} noShrink>
        <span className="hidden sm:inline">{t('scout.ui.pointFor')} {awayName.slice(0, 8).toUpperCase()}</span>
        <span className="sm:hidden">{t('scout.ui.pointFor')}</span>
      </ToolbarBtn>

      <div className="hidden sm:block h-8 w-px bg-border mx-1" />

      <ToolbarBtn onClick={onUndoAction} title={t('scout.ui.undo') as string}>
        <Undo2 className="w-4 h-4" /> {t('scout.ui.undo')}
      </ToolbarBtn>
      <ToolbarBtn onClick={onUndoRally} title={t('scout.ui.undoRally') as string}>
        <Undo2 className="w-4 h-4" /> {t('scout.ui.undoRally')}
      </ToolbarBtn>
      <ToolbarBtn onClick={onSubstitution} title={t('scout.ui.substitution') as string}>
        <ArrowLeftRight className="w-4 h-4" /> {t('scout.ui.sub')}
      </ToolbarBtn>

      <ToolbarBtn onClick={onTimeoutHome} title={`${t('scout.ui.timeout')} ${homeName} (${homeTimeoutsLeft})`} disabled={homeTimeoutsLeft <= 0}>
        <Clock className="w-4 h-4" /> T-O {homeName.slice(0, 4)}
      </ToolbarBtn>
      <ToolbarBtn onClick={onTimeoutAway} title={`${t('scout.ui.timeout')} ${awayName} (${awayTimeoutsLeft})`} disabled={awayTimeoutsLeft <= 0}>
        <Clock className="w-4 h-4" /> T-O {awayName.slice(0, 4)}
      </ToolbarBtn>

      {onQuickActions && (
        <ToolbarBtn onClick={onQuickActions} variant="primary" title={t('scout.ui.quickActions') as string}>
          ⚡
        </ToolbarBtn>
      )}

      <div className="hidden sm:block flex-1" />

      <LongPressBtn
        onLongPress={() => (onEndSet ? onEndSet() : undefined)}
        variant="warning"
        title="Tieni premuto per terminare il set"
        noShrink
        duration={800}
      >
        <SkipForward className="w-4 h-4" /> {t('scout.ui.endSet')}
      </LongPressBtn>
      <ToolbarBtn onClick={onExport} variant="primary" title={t('scout.ui.exportDvw') as string} noShrink>
        <Download className="w-4 h-4" /> DVW
      </ToolbarBtn>
      {onSettings && (
        <ToolbarBtn onClick={onSettings} title={t('scout.ui.settings') as string} noShrink>
          <Settings className="w-4 h-4" />
        </ToolbarBtn>
      )}
    </div>
  );
}

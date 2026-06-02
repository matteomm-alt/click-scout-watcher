export const getTooltipStyle = () => ({
  background: 'hsl(var(--card))',
  border: '0.5px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
  color: 'hsl(var(--card-foreground))',
  padding: '8px 12px',
});

export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  away: '#E24B4A',
  positive: '#1D9E75',
  negative: '#E24B4A',
  neutral: 'hsl(var(--muted-foreground))',
  serve: '#F97316',
  receive: '#3B8BD4',
  attack: '#E24B4A',
  block: '#7F77DD',
  dig: '#1D9E75',
  set: '#BA7517',
};

// Palette ordinata per fondamentale — usata nei grafici multi-skill
// Ordine: Ricezione, Attacco, Battuta, Muro, Difesa, Alzata
export const SKILL_COLORS: Record<string, string | string[]> = {
  'Ricezione': '#3B8BD4',
  'Attacco':   '#E24B4A',
  'Battuta':   '#F97316',
  'Muro':      '#7F77DD',
  'Difesa':    '#1D9E75',
  'Alzata':    '#BA7517',
  default: ['#F97316','#3B8BD4','#E24B4A','#1D9E75','#7F77DD','#BA7517','#0891B2'],
};

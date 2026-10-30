import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const KEY = 'app_theme';
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let current: Theme = typeof window === 'undefined' ? 'dark' : readStored();

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
apply(current);

function setCurrent(next: Theme) {
  if (next === current) return;
  current = next;
  apply(next);
  try { localStorage.setItem(KEY, next); } catch { /* storage non disponibile */ }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

/**
 * Tema chiaro/scuro condiviso: tutti i componenti che lo usano (menu, barra in alto, Personalizza)
 * restano sincronizzati perché lo stato vive fuori dai componenti.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'dark' as Theme);
  const setTheme = useCallback((t: Theme) => setCurrent(t), []);
  const toggleTheme = useCallback(() => setCurrent(current === 'dark' ? 'light' : 'dark'), []);
  return { theme, setTheme, toggleTheme };
}

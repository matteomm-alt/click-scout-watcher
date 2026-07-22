import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL-safe slug. Lowercase, no diacritics, max 60 chars.
 * Used for society slugs and other unique identifiers.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * UUID v4 con fallback per browser vecchi (Safari < 15.4, iOS < 15.4)
 * dove `crypto.randomUUID` non è disponibile e causerebbe crash.
 */
export function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  // Fallback deterministicamente unico entro la sessione
  const rnd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `id-${Date.now().toString(36)}-${rnd.slice(0, 16)}`;
}

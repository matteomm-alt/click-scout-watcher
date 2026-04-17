/**
 * Parser per file DataVolley (.dvw) — formato FILEFORMAT 2.0
 */

export type DvwSide = 'home' | 'away';

export interface DvwTeamHeader {
  side: DvwSide;
  externalId: string;
  name: string;
  setsWon: number;
  coach: string;
  assistants: string;
}

export type StandardRole = 'S' | 'O' | 'OP' | 'M' | 'L' | 'U';

export interface DvwPlayer {
  side: DvwSide;
  number: number;
  externalId: string;
  lastName: string;
  firstName: string;
  role: StandardRole;
  rawRole: string;
  isLibero: boolean;
  startPositions: (number | null)[];
}

export function mapDvwRole(rawRole: string, isLibero: boolean): StandardRole {
  if (isLibero) return 'L';
  const r = (rawRole || '').trim();
  switch (r) {
    case '1': return 'L';
    case '2': return 'M';
    case '3': return 'O';
    case '4': return 'OP';
    case '5': return 'S';
    default:  return 'U';
  }
}

export interface DvwSetResult {
  played: boolean;
  intermediates: string[];
  duration: number | null;
}

export interface DvwHeader {
  date: string | null;
  time: string | null;
  season: string | null;
  league: string | null;
  phase: string | null;
  venue: string | null;
  city: string | null;
  generator: string;
}

export type DvwSkill = 'S' | 'R' | 'A' | 'B' | 'D' | 'E' | 'F' | 'O' | 'P' | 'X';

export interface DvwAction {
  rallyIndex: number;
  actionIndex: number;
  side: DvwSide;
  playerNumber: number | null;
  skill: string;
  skillType: string;
  evaluation: string;
  startZone: number | null;
  endZone: number | null;
  endSubzone: string | null;
  attackCombo: string | null;
  setCombo: string | null;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  homeRotation: number[];
  awayRotation: number[];
  homeSetterPos: number | null;
  awaySetterPos: number | null;
  servingSide: DvwSide | null;
  rawCode: string;
  timestampClock: string | null;
}

export interface DvwSubstitution {
  rallyIndex: number;
  side: DvwSide;
  playerIn: number;
  playerOut: number;
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface DvwParsed {
  header: DvwHeader;
  teams: { home: DvwTeamHeader; away: DvwTeamHeader };
  players: { home: DvwPlayer[]; away: DvwPlayer[] };
  setResults: DvwSetResult[];
  setsWon: { home: number; away: number };
  actions: DvwAction[];
  substitutions: DvwSubstitution[];
  warnings: string[];
}

function splitSection(content: string): Record<string, string[]> {
  const lines = content.split(/\r?\n/);
  const sections: Record<string, string[]> = {};
  let current = '';
  for (const line of lines) {
    const m = line.match(/^\[3([A-Z-]+)\]$/);
    if (m) {
      current = m[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  return sections;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseTime(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})[.:](\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

function toInt(s: string | undefined, fallback: number | null = null): number | null {
  if (s === undefined || s === '') return fallback;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseHeader(sections: Record<string, string[]>): DvwHeader {
  const matchLine = (sections['MATCH'] || [])[0] || '';
  const moreLine = (sections['MORE'] || [])[0] || '';
  const cols = matchLine.split(';');
  const moreCols = moreLine.split(';');
  const generator = (sections['DATAVOLLEYSCOUT'] || [])
    .find(l => l.startsWith('GENERATOR-PRG'))?.split(':')[1]?.trim() || 'Unknown';
  return {
    date: parseDate(cols[0]),
    time: parseTime(cols[1]),
    season: cols[2]?.trim() || null,
    league: cols[3]?.trim() || null,
    phase: cols[4]?.trim() || null,
    venue: moreCols[2]?.trim() || moreCols[1]?.trim() || null,
    city: moreCols[3]?.trim() || null,
    generator,
  };
}

function parseTeams(sections: Record<string, string[]>): { home: DvwTeamHeader; away: DvwTeamHeader } {
  const lines = (sections['TEAMS'] || []).filter(l => l.trim());
  const make = (line: string, side: DvwSide): DvwTeamHeader => {
    const c = line.split(';');
    return {
      side,
      externalId: c[0] || '',
      name: c[1]?.trim() || (side === 'home' ? 'Home' : 'Away'),
      setsWon: toInt(c[2], 0) ?? 0,
      coach: c[3]?.trim() || '',
      assistants: c[4]?.trim() || '',
    };
  };
  return {
    home: make(lines[0] || '', 'home'),
    away: make(lines[1] || '', 'away'),
  };
}

function parseSetResults(sections: Record<string, string[]>): { results: DvwSetResult[]; setsWon: { home: number; away: number } } {
  const lines = (sections['SET'] || []).filter(l => l.trim());
  const results: DvwSetResult[] = [];
  let homeWon = 0, awayWon = 0;
  for (const line of lines) {
    const c = line.split(';');
    const played = c[0]?.trim().toLowerCase() === 'true';
    if (!played) continue;
    const intermediates = [c[1], c[2], c[3], c[4]].map(x => x?.trim()).filter(Boolean) as string[];
    if (intermediates.length === 0) continue;
    const duration = toInt(c[5]);
    results.push({ played, intermediates, duration });
    const last = intermediates[intermediates.length - 1];
    if (last) {
      const m = last.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
      if (m) {
        const h = parseInt(m[1], 10);
        const a = parseInt(m[2], 10);
        if (h > a) homeWon++; else awayWon++;
      }
    }
  }
  return { results, setsWon: { home: homeWon, away: awayWon } };
}

function parsePlayers(sections: Record<string, string[]>, key: 'PLAYERS-H' | 'PLAYERS-V', side: DvwSide): DvwPlayer[] {
  const lines = (sections[key] || []).filter(l => l.trim());
  const players: DvwPlayer[] = [];
  for (const line of lines) {
    const c = line.split(';');
    const number = toInt(c[1]);
    if (number === null) continue;
    const startPositions = [c[3], c[4], c[5], c[6], c[7]].map(s => {
      const t = s?.trim();
      if (!t || t === '*' || t === '0') return null;
      const n = parseInt(t, 10);
      return Number.isNaN(n) ? null : n;
    });
    const rawRole = c[13]?.trim() || '';
    const isLibero = (c[14]?.trim().toLowerCase() === 'true');
    players.push({
      side,
      number,
      externalId: c[8]?.trim() || '',
      lastName: c[9]?.trim() || c[11]?.trim() || `#${number}`,
      firstName: c[10]?.trim() || '',
      role: mapDvwRole(rawRole, isLibero),
      rawRole,
      isLibero,
      startPositions,
    });
  }
  return players;
}

const SKILL_LETTERS = new Set(['S', 'R', 'A', 'B', 'D', 'E', 'F']);

function parseScout(sections: Record<string, string[]>): {
  actions: DvwAction[];
  substitutions: DvwSubstitution[];
  warnings: string[];
} {
  const lines = (sections['SCOUT'] || []).filter(l => l.trim());
  const actions: DvwAction[] = [];
  const substitutions: DvwSubstitution[] = [];
  const warnings: string[] = [];

  let rallyIndex = 0;
  let actionIndexInRally = 0;
  let servingSide: DvwSide | null = null;
  let homeSetterPos: number | null = null;
  let awaySetterPos: number | null = null;
  let lastServingSide: DvwSide | null = null;

  for (const line of lines) {
    const c = line.split(';');
    const code = c[0] || '';
    if (!code) continue;

    const timestampClock = c[7] || null;
    const setNumber = toInt(c[8], 1) ?? 1;
    const homeScore = toInt(c[9], 0) ?? 0;
    const awayScore = toInt(c[10], 0) ?? 0;

    const homeRot = [c[15], c[16], c[17], c[18], c[19], c[20]].map(s => toInt(s, 0) ?? 0);
    const awayRot = [c[21], c[22], c[23], c[24], c[25], c[26]].map(s => toInt(s, 0) ?? 0);

    if (code.startsWith('**')) {
      rallyIndex = 0;
      actionIndexInRally = 0;
      homeSetterPos = null;
      awaySetterPos = null;
      lastServingSide = null;
      continue;
    }

    const setterMatch = code.match(/^([*a])P(\d{1,2})(?:>|$)/);
    if (setterMatch) {
      const sideChar = setterMatch[1];
      const pos = parseInt(setterMatch[2], 10);
      if (pos >= 1 && pos <= 6) {
        if (sideChar === '*') homeSetterPos = pos;
        else awaySetterPos = pos;
      }
      continue;
    }

    const zoneMatch = code.match(/^([*a])z(\d)/);
    if (zoneMatch) {
      const newServingSide: DvwSide = zoneMatch[1] === '*' ? 'home' : 'away';
      if (lastServingSide && lastServingSide !== newServingSide) {
        if (newServingSide === 'home' && homeSetterPos !== null) {
          homeSetterPos = homeSetterPos === 1 ? 6 : homeSetterPos - 1;
        } else if (newServingSide === 'away' && awaySetterPos !== null) {
          awaySetterPos = awaySetterPos === 1 ? 6 : awaySetterPos - 1;
        }
      }
      servingSide = newServingSide;
      lastServingSide = newServingSide;
      rallyIndex++;
      actionIndexInRally = 0;
      continue;
    }

    if (code.match(/^([*a])p\d/)) continue;

    const subMatch = code.match(/^([*a])c(\d+):(\d+)/);
    if (subMatch) {
      substitutions.push({
        rallyIndex,
        side: subMatch[1] === '*' ? 'home' : 'away',
        playerIn: parseInt(subMatch[2], 10),
        playerOut: parseInt(subMatch[3], 10),
        setNumber, homeScore, awayScore,
      });
      continue;
    }

    if (code.startsWith('*$') || code.startsWith('a$')) continue;
    if (/^[*a]T/.test(code)) continue;
    if (/^[*a][YRBP]/.test(code)) continue;
    if (/^\*\*/.test(code)) continue;
    if (/^\[/.test(code) || /^\d+$/.test(code)) continue;

    const actMatch = code.match(/^([*a])(\d{2})([A-Z])([A-Z])([#+!\-/=])(.*)$/);
    if (actMatch) {
      const [, sideChar, numStr, skill, skillType, evaluation, tail] = actMatch;
      if (!SKILL_LETTERS.has(skill)) continue;

      const tailParts = tail.split('~');
      let attackCombo: string | null = null;
      if (/^[A-Z][A-Z0-9]{1,2}$/.test(tailParts[0] || '')) {
        attackCombo = tailParts[0];
      }
      let startZone: number | null = null;
      let endZone: number | null = null;
      let endSubzone: string | null = null;
      let zoneIdx = -1;
      for (let i = 0; i < tailParts.length; i++) {
        const part = tailParts[i];
        const zm = part.match(/^(\d)(\d)([A-D])?$/);
        if (zm) {
          startZone = parseInt(zm[1], 10);
          endZone = parseInt(zm[2], 10);
          if (zm[3]) endSubzone = zm[3];
          zoneIdx = i;
          break;
        }
      }
      if (startZone === null) {
        for (const part of tailParts) {
          const zm1 = part.match(/^(\d)$/);
          if (zm1) { startZone = parseInt(zm1[1], 10); break; }
        }
      }
      let setCombo: string | null = null;
      if (zoneIdx >= 0 && tailParts[zoneIdx + 1]) {
        const sm = tailParts[zoneIdx + 1].match(/[A-Z]\d?([A-Z]{1,3})/);
        if (sm) setCombo = sm[1];
      }

      actions.push({
        rallyIndex,
        actionIndex: actionIndexInRally++,
        side: sideChar === '*' ? 'home' : 'away',
        playerNumber: parseInt(numStr, 10),
        skill, skillType, evaluation,
        startZone, endZone, endSubzone,
        attackCombo, setCombo,
        setNumber, homeScore, awayScore,
        homeRotation: homeRot, awayRotation: awayRot,
        homeSetterPos, awaySetterPos,
        servingSide, rawCode: code, timestampClock,
      });
      continue;
    }

    warnings.push(code);
  }

  return { actions, substitutions, warnings: warnings.slice(0, 50) };
}

export function parseDvw(content: string): DvwParsed {
  const sections = splitSection(content);
  const header = parseHeader(sections);
  const teams = parseTeams(sections);
  const players = {
    home: parsePlayers(sections, 'PLAYERS-H', 'home'),
    away: parsePlayers(sections, 'PLAYERS-V', 'away'),
  };
  const { results: setResults, setsWon } = parseSetResults(sections);
  const { actions, substitutions, warnings } = parseScout(sections);
  return { header, teams, players, setResults, setsWon, actions, substitutions, warnings };
}

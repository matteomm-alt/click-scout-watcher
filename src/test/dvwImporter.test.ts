import { describe, it, expect } from 'vitest';
import { parseDvw, mapDvwRole } from '@/lib/dvwImporter';

const SAMPLE = `[3DATAVOLLEYSCOUT]
GENERATOR-PRG: TestGen
[3MATCH]
18/05/2026;20.30;2025/2026;Serie A;Regular;
[3MORE]
;;PalaTest;Roma
[3TEAMS]
HOM;Casa;2;CoachH;AsstH
AWY;Ospite;1;CoachA;AsstA
[3SET]
True;8-6;16-14;25-22;;28
True;25-20;;;;25
True;25-23;;;;30
False;;;;;
False;;;;;
[3PLAYERS-H]
;1;;1;*;*;*;*;ext1;Rossi;Mario;Rossi M.;;5;false
;6;;*;1;*;*;*;ext6;Bianchi;Luca;Bianchi L.;;2;false
;10;;*;*;*;*;*;ext10;Verdi;Anna;Verdi A.;;1;true
[3PLAYERS-V]
;3;;1;*;*;*;*;extA3;Neri;Tom;Neri T.;;5;false
[3SCOUT]
**1set
*P1>LUp
ap6>LUp
*z1;;;;;;;;1;0;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
*01SH#;;;;;;;12:00;1;0;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
a03RH+~~~45;;;;;;;12:00;1;0;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
*c1:6;;;;;;;12:01;1;1;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
*06AH#~X5~25;;;;;;;12:02;1;1;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
**2set
*P1>LUp
*z1;;;;;;;;2;0;0;;;;;1;2;3;4;5;6;6;5;4;3;2;1
WEIRDCODE_UNKNOWN
`;

describe('dvwImporter', () => {
  describe('mapDvwRole', () => {
    it('mappa correttamente i ruoli numerici', () => {
      expect(mapDvwRole('1', false)).toBe('L');
      expect(mapDvwRole('2', false)).toBe('M');
      expect(mapDvwRole('3', false)).toBe('O');
      expect(mapDvwRole('4', false)).toBe('OP');
      expect(mapDvwRole('5', false)).toBe('S');
      expect(mapDvwRole('', false)).toBe('U');
      expect(mapDvwRole('5', true)).toBe('L'); // libero ha precedenza
    });
  });

  describe('parseDvw', () => {
    const parsed = parseDvw(SAMPLE);

    it('parse header data/ora/lega/sede', () => {
      expect(parsed.header.date).toBe('2026-05-18');
      expect(parsed.header.time).toBe('20:30');
      expect(parsed.header.league).toBe('Serie A');
      expect(parsed.header.venue).toBe('PalaTest');
      expect(parsed.header.city).toBe('Roma');
      expect(parsed.header.generator).toBe('TestGen');
    });

    it('parse squadre home/away', () => {
      expect(parsed.teams.home.name).toBe('Casa');
      expect(parsed.teams.away.name).toBe('Ospite');
      expect(parsed.teams.home.coach).toBe('CoachH');
    });

    it('parse risultati set giocati e calcola setsWon', () => {
      expect(parsed.setResults).toHaveLength(3);
      expect(parsed.setsWon.home).toBe(3);
      expect(parsed.setsWon.away).toBe(0);
      expect(parsed.setResults[0].intermediates).toEqual(['8-6', '16-14', '25-22']);
    });

    it('parse giocatori e identifica libero', () => {
      expect(parsed.players.home).toHaveLength(3);
      const libero = parsed.players.home.find(p => p.number === 10);
      expect(libero?.isLibero).toBe(true);
      expect(libero?.role).toBe('L');
    });

    it('parse azioni con skill validi e ignora codici sconosciuti (warning)', () => {
      const actionSkills = parsed.actions.map(a => a.skill);
      expect(actionSkills).toContain('S');
      expect(actionSkills).toContain('R');
      expect(actionSkills).toContain('A');
      // setter pos viene tracciato
      const first = parsed.actions[0];
      expect(first.homeSetterPos).toBe(1);
      expect(parsed.warnings.length).toBeGreaterThan(0);
      expect(parsed.warnings).toContain('WEIRDCODE_UNKNOWN');
    });

    it('parse sostituzioni', () => {
      expect(parsed.substitutions).toHaveLength(1);
      expect(parsed.substitutions[0].playerIn).toBe(1);
      expect(parsed.substitutions[0].playerOut).toBe(6);
    });

    it('estrae zone e combo attacco', () => {
      const attack = parsed.actions.find(a => a.skill === 'A');
      expect(attack?.attackCombo).toBe('X5');
      expect(attack?.startZone).toBe(2);
      expect(attack?.endZone).toBe(5);
    });

    it('cambia set: actionIndexInRally reset al **Nset', () => {
      const set1 = parsed.actions.filter(a => a.setNumber === 1);
      const set2 = parsed.actions.filter(a => a.setNumber === 2);
      expect(set1.length).toBeGreaterThan(0);
      // set 2 ha solo z1 ma nessuna azione skill (corretto: il codice di servizio z non genera azione skill)
      expect(set2.length).toBe(0);
    });
  });
});

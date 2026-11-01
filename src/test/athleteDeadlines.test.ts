import { describe, it, expect } from 'vitest';
import { daysUntil, deadlineStatus, buildDeadlineRows, sortByUrgency, deadlinesToCsv } from '@/lib/athleteDeadlines';

const today = new Date(2026, 10, 1); // 1 novembre 2026

describe('scadenze atleti', () => {
  it('calcola i giorni senza errori di fuso', () => {
    expect(daysUntil('2026-11-01', today)).toBe(0);
    expect(daysUntil('2026-11-02', today)).toBe(1);
    expect(daysUntil('2026-10-31', today)).toBe(-1);
  });
  it('stati: scaduto, in scadenza (<=30 gg), ok, mancante', () => {
    expect(deadlineStatus('2026-10-31', today)).toBe('scaduto');
    expect(deadlineStatus('2026-11-01', today)).toBe('in_scadenza');
    expect(deadlineStatus('2026-12-01', today)).toBe('in_scadenza'); // 30 giorni
    expect(deadlineStatus('2026-12-02', today)).toBe('ok');
    expect(deadlineStatus(null, today)).toBe('mancante');
  });
  it('una riga per atleta e tipo, ordinate per urgenza', () => {
    const rows = buildDeadlineRows(
      [{ id: 'a', first_name: 'Anna', last_name: 'Rossi', team_id: 't', medical_cert_expiry: '2026-10-01' },
       { id: 'b', first_name: 'Bea', last_name: 'Bianchi', team_id: 't', medical_cert_expiry: '2027-06-01' }],
      [{ athlete_id: 'b', society_id: 's', tax_code: null, birth_place: null, address: null, guardian_name: null,
         guardian_phone: null, guardian_email: null, federation_card_number: null,
         federation_card_expiry: '2026-11-20', insurance_expiry: null, enrollment_renewal_date: null, admin_notes: null }],
      today);
    expect(rows).toHaveLength(8);
    const sorted = sortByUrgency(rows);
    expect(sorted[0]).toMatchObject({ athleteId: 'a', kind: 'medical_cert', status: 'scaduto' });
    expect(sorted[1]).toMatchObject({ athleteId: 'b', kind: 'federation_card', status: 'in_scadenza' });
    expect(sorted[sorted.length - 1].status).toBe('ok');
  });
  it('CSV con data italiana e virgolette', () => {
    const csv = deadlinesToCsv(
      [{ athleteId: 'a', athleteName: 'Rossi "Anna"; B', teamId: null, kind: 'insurance', date: '2026-11-20', status: 'in_scadenza', days: 19 }],
      () => '—');
    expect(csv.split('\n')[1]).toBe('"Rossi ""Anna""; B";—;Assicurazione;20/11/2026;In scadenza;19');
  });
});

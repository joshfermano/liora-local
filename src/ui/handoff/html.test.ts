import { describe, expect, it } from 'vitest';
import { en } from '../../content/copy';
import { handoffReport, type HandoffInput } from '../../core/handoff';
import type { Entry } from '../../core/types';
import { reportHtml } from './html';

const NOW = new Date('2026-10-10T04:30:00.000Z');
const ENTRY = {
  id: 'e1',
  created_at: '2026-10-10T04:20:00.000Z',
  text: 'sakit <b>ulo</b> & "malabo" paningin',
  input: 'text',
  findings: [{ code: 'severe_headache', severity: 'severe', sources: ['lexicon'], confidence: 0.9 }],
  extraction: null,
  decision: { level: 'go_now', fired: [{ rule_id: 'ANC.DT.01.headache', codes: ['severe_headache'] }] },
  card_ids: [],
  models: [],
} as unknown as Entry;

const input = (over: Partial<HandoffInput> = {}): HandoffInput => ({
  patient: { name: 'Gweny', age: 22, bloodType: 'O+', heightCm: 157, weightKg: 55, status: 'pregnant', weeks: 32 },
  emergency: { name: 'Ana', relation: 'Sister', phone: '+63 917 123 4567' },
  entry: ENTRY,
  entries: [ENTRY],
  dayLogs: [{ date: '2026-10-09', flow: null, symptoms: ['headache'], moods: ['anxious'], activities: [] }],
  periods: [],
  now: NOW,
  ...over,
});

describe('reportHtml', () => {
  it('escapes her own words', () => {
    const html = reportHtml(handoffReport(input()));
    expect(html).toContain('sakit &lt;b&gt;ulo&lt;/b&gt; &amp; &quot;malabo&quot; paningin');
    expect(html).not.toContain('<b>ulo</b>');
  });

  it('has every section when the data exists, with copy and no external resources', () => {
    const html = reportHtml(handoffReport(input()), { bp: { systolic: 150, diastolic: 95 } });
    for (const key of ['handoff.title', 'handoff.subtitle', 'handoff.patient', 'handoff.pregnancy', 'handoff.concern', 'handoff.said', 'handoff.signs', 'handoff.rule', 'handoff.recent', 'handoff.emergency', 'handoff.footer', 'nurse.bp']) {
      expect(html).toContain(en(key).replace("'", '&#39;'));
    }
    expect(html).toContain('150/95');
    expect(html).toContain('Gweny');
    expect(html).toContain('+63 917 123 4567');
    expect(html).toContain('ANC.DT.01.headache');
    expect(html).toContain('class="urgent"');
    expect(html).not.toMatch(/https?:\/\/|<script|<link|<img|src=/i);
  });

  it('leaves out sections and rows that have no data', () => {
    const html = reportHtml(handoffReport(input({ patient: {}, emergency: undefined, entry: null, entries: [], dayLogs: [] })));
    expect(html).not.toContain(en('handoff.patient'));
    expect(html).not.toContain('concern<');
    expect(html).not.toContain(en('handoff.emergency'));
    expect(html).not.toContain(en('nurse.bp'));
    expect(html).toContain(en('handoff.recent.none'));
    expect(html).toContain(en('handoff.status.unknown'));
  });

  it('puts no words in the report that are not her data or copy', () => {
    const html = reportHtml(handoffReport(input()));
    const text = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, '|');
    const allowed = new Set(
      [
        'handoff.title', 'handoff.subtitle', 'handoff.footer', 'handoff.patient', 'handoff.pregnancy', 'handoff.concern',
        'handoff.said', 'handoff.signs', 'handoff.rule', 'handoff.recent', 'handoff.emergency', 'handoff.status.pregnant',
        'profile.name', 'profile.age', 'blood.title', 'profile.height', 'profile.weight', 'nurse.logged', 'em.name', 'em.relation', 'em.phone',
      ].map(en),
    );
    const unknown = text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !allowed.has(s))
      .filter((s) => !/\d/.test(s) && !['Gweny', 'Sister', 'Ana', 'O+', 'Headache · severe', 'Headache', 'Headache, Anxious'].includes(s) && !s.includes('sakit'));
    expect(unknown).toEqual([]);
  });
});
